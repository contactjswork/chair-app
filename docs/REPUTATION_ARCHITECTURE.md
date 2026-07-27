# Architecture de réputation CHAIR — V2 (spécialités)

Décidé et implémenté le 2026-07-10, suite à la réflexion produit sur la
gamification comme fondation des classements, de CHAIR+ et du programme
ambassadeur. Remplace le score CHAIR mono-dimensionnel par une réputation
construite au niveau de la **spécialité**, conformément à la philosophie
produit : *devenir le coiffeur de référence de sa spécialité dans sa ville*.

## Pourquoi

Avant cette passe, `chair_score`/`chair_level` étaient un unique nombre par
coiffeur, dérivé de compteurs globaux (`posts_count`, `reviews_count`,
`visits_count`...). Incohérent avec la vision produit : un coiffeur excellent
en Coupe Homme et inexistant en Coupe Femme doit être visible comme tel — pas
noyé dans une moyenne. Sans cette refonte, les classements par spécialité
(priorité produit suivante) auraient dû être bricolés en parallèle du score
réel, avec un risque de raconter deux histoires différentes.

## Modèle de données

**`hairdresser_specialty_progress`** (une ligne par coiffeur × spécialité
choisie) : `score`, `level` (0-5), `posts_count`, `reviews_count`,
`avg_rating`, `visits_count`, `is_reference` (bool). Recalculée à chaque
action pertinente (post publié, avis reçu, visite confirmée) via
`SpecialtyReputationService::refreshAll()`.

**Attribution à une spécialité** :
- `posts.specialty_id` — déjà existant, inchangé.
- `reviews.specialty_id` — nouvelle FK nullable. Héritée du service du
  rendez-vous (`appointment.service_id → services.specialty_id`) pour les
  avis liés à un RDV ; posée directement par le flow QR pour les visites
  certifiées (voir plus bas) ; backfillée pour les avis existants liés à un
  RDV avec service connu.
- `verified_visits.specialty_id` — nouvelle FK nullable, héritée du
  `qr_tokens.specialty_id` du token scanné.

## Score d'une spécialité

Trois dimensions, chacune à paliers (même logique que les badges existants,
appliquée par spécialité plutôt qu'au profil entier) :

**Réalisations publiées dans la spécialité**
| Seuil | Points |
|---|---|
| 1 | 10 |
| 5 | 30 |
| 20 | 70 |
| 50 | 150 |

**Avis dans la spécialité** (le palier le plus élevé atteint l'emporte)
| Condition | Points |
|---|---|
| ≥1 avis | 20 |
| ≥5 avis, note ≥4.5 | 70 |
| ≥10 avis, note ≥4.8 | 130 |
| ≥5 avis, note ≥4.95 | 220 |

**Visites prouvées dans la spécialité** (RDV honoré via CHAIR **ou** visite
certifiée par QR — les deux anciennes catégories globales "réservations" et
"visites" fusionnent ici, toutes deux prouvant un passage réel)
| Seuil | Points |
|---|---|
| 10 | 25 |
| 50 | 70 |
| 250 | 180 |
| 1000 | 400 |

`specialty_score = points réalisations + points avis + points visites`
(max théorique ≈ 770 pour une spécialité totalement maximée).

### Niveau d'une spécialité

| Niveau | Nom | Seuil |
|---|---|---|
| 0 | Novice | 0 |
| 1 | Débutant confirmé | 60 |
| 2 | Confirmé | 150 |
| 3 | Expert | 300 |
| 4 | Référence locale | 500 |
| 5 | **Légende** | — critère relatif, jamais un seuil de points |

Le niveau 5 n'est **jamais** atteint par un score, uniquement par
`is_reference` : top 1% du `specialty_score` parmi les coiffeurs actifs
(`posts_count > 0`) ayant cette spécialité dans la même ville, avec un
échantillon minimum de 15 (sinon verrouillé — un "top 1%" sur 3 coiffeurs n'a
pas de sens). C'est un choix délibéré : un seuil de points fixe s'assouplit
mécaniquement à mesure que la plateforme grossit ; un critère relatif reste
difficile indéfiniment et se branche directement sur les futurs classements
ville × spécialité. Badge correspondant : `specialty_reference` ("Référence
locale"), débloqué dès qu'une spécialité au moins atteint ce statut.

## Score global (carrière)

`chair_score = points carrière + agrégat pondéré des spécialités`

**Points carrière** : somme des badges des catégories *profil*, *communauté*,
*streak*, *discipline*, *vérification* et *spécial* (hors
`specialty_reference` qui vient de l'agrégat) — signaux de marque
personnelle, pas de compétence métier. Inchangé par rapport à l'ancien
système.

**Agrégat pondéré** : PAS une simple somme des `specialty_score`. Les
spécialités sont triées par score décroissant, puis pondérées avec des poids
qui chutent vite :

| Rang | Poids |
|---|---|
| 1 (principale) | 100% |
| 2 | 55% |
| 3 | 32% |
| 4 | 18% |
| 5 | 10% |
| 6+ | 6% → 2% |

Plus un plafond dur : l'agrégat ne peut jamais dépasser **2.3×** le score de
la spécialité principale. Concrètement : un expert avec 1000 pts dans une
seule spécialité obtient un agrégat de 1000. Un coiffeur "moyen" avec 200 pts
dans 8 spécialités obtient environ 420 — largement battu par l'expert, alors
qu'une somme brute (1600) l'aurait dépassé. Un coiffeur réellement fort dans
plusieurs spécialités (ex. 700 pts × 3) est récompensé pour de la vraie
polyvalence (~1260), pas juste pour avoir coché beaucoup de cases.

## Réputation des salariés — QR personnel + fallback gérant

Le salarié ne facture pas directement — sa réputation doit quand même lui
appartenir intégralement.

**Méthode principale** : le générateur de QR (`/pro/mon-qr`) demande
désormais *"quelle spécialité ?"* avant de générer/rafraîchir le QR
(`qr_tokens.specialty_id`). Chaque visite confirmée et chaque avis qui en
découle héritent automatiquement cette spécialité. Reste un réflexe métier
quotidien, comme demander un avis Google.

**Fallback gérant** : `POST /my-salon/hairdressers/{id}/review-invite`
(`SalonController::inviteReview`). Le gérant choisit la spécialité, le
système génère **le même type de token QR** que le coiffeur aurait généré
lui-même, mais avec une validité longue (48h au lieu de 30 min) car destiné à
être envoyé de façon asynchrone (SMS, WhatsApp) plutôt que montré en direct.
Le client suit exactement le flow `/scan/{token}` existant : il confirme sa
visite et rédige **lui-même** son avis. Le gérant ne peut à aucun moment
écrire ou modifier un avis à la place du client — il ne fait que créer
l'opportunité, garantissant qu'un excellent coiffeur ne soit jamais pénalisé
parce qu'il a oublié son QR ou que le client est reparti vite.

**Attribution** : `verified_visits`/`reviews` restent liés à `hairdresser_id`
uniquement, jamais à `salon_id` — la réputation suit le coiffeur, pas le
salon, même s'il change d'établissement.

**Roadmap V2 (pas fait)** : intégration avec des logiciels de réservation
tiers (Planity, Shortcuts...) pour attribuer les visites automatiquement,
sans dépendre du QR.

## Fondation classements ville × spécialité

`hairdresser_specialty_progress` porte déjà tout ce qu'il faut
(`specialty_id`, `score`, ville via le profil lié) pour que
`LeaderboardController` requête directement dessus au lieu de formules
bricolées sur des compteurs globaux. **Pas encore branché** — le contrôleur
actuel n'a pas été modifié dans cette passe (scope : fondations de données +
calcul, pas la UI de classement elle-même).

## Classements par spécialité — livré le 2026-07-10 (suite)

`GET /leaderboard?specialty_id=&geo=city|department|region|country&geo_value=` —
classé sur `specialty_score` avec décote d'activité (score × 0.7 si inactif
>6 mois dans la spécialité, exclu si >1 an). `GeoLookupService` dérive
département/région du code postal (aucune colonne DB ajoutée), avec alias
pour les anciennes régions encore utilisées couramment ("Alsace" → 67/68).
Le filtre `hp.posts_count > 0` a été retiré du classement spécialité et du
calcul "top 1%" local : un salarié sans réalisation publiée mais avec de
vrais avis/visites certifiés doit pouvoir être classé, sinon le système
exclut structurellement le public qu'il doit justement servir.

`specialty_highlights` sur le profil public (`HairdresserController::show()`)
— "pourquoi ce coiffeur est reconnu", 1 à 3 signaux maximum (🏆 légende, 🥇 top
3 local avec échantillon minimum 5 pour éviter un "top 1 sur 1" trompeur, ⭐
expert, 📈 progression rapide). Le détail complet des badges reste dans CHAIR
PRO — la page profil public n'affiche plus la liste exhaustive.

## Badges V2 — restructuration complète en 3 familles (2026-07-10)

Le catalogue de badges est réorganisé en 3 familles distinctes, chacune avec
un rôle différent :

**Badges MÉTIER** — pas dans `BadgeService::BADGES` (catalogue statique),
dérivés dynamiquement de `hairdresser_specialty_progress` puisque leur nom
dépend de la spécialité (10 possibles) : Novice → Débutant confirmé →
Spécialiste → Expert → Référence locale → Référence régionale (badge noir).
Les niveaux 4 et 5 combinent TOUJOURS seuil de points ET critère relatif,
jamais l'un sans l'autre :
- **Référence locale** (niv. 4) : score ≥ 500 ET top 1% dans sa ville (échantillon ≥ 15).
- **Référence régionale** (niv. 5, badge noir, palier ultime) : score ≥ 650 ET top 1% dans sa région (échantillon ≥ 30) ET activité dans la spécialité ≤ 90 jours ET au moins 5 clients distincts ayant laissé un avis (anti-fraude — un seul compte qui spamme des avis ne suffit plus).

**Badges CARRIÈRE** — `BadgeService::BADGES`, family `carriere`. Paliers
entièrement retravaillés pour rester motivants sur plusieurs années (abonnés
100/500/2 500/15 000 au lieu de 1/30/100/500 ; réalisations totales
10/50/300 au lieu de 5/20/50) + nouvelle catégorie ancienneté (3 mois/1 an/3
ans/7 ans) + `streak_365` (un an d'activité sans interruption). Emplacement
`ambassador_program` réservé mais toujours verrouillé — le programme
ambassadeur lui-même n'existe pas encore.

**Badges EXCEPTIONNELS** — family `exceptionnel` : `top_10_local` (top 10
d'une spécialité, sa ville), `top_1_percent` (remplace l'ancien `top_10` —
vrai top 1%, pas 10%, échantillon minimum 50), `pioneer_chair` (200 premiers
inscrits — constante figée), `national_reference` (top 1% France entière sur
au moins une spécialité), `ambassador_national` (verrouillé, programme pas
construit).

**Badges retirés** (superflus, remplacés par ce qui précède, codes conservés
en base pour ne rien casser mais plus dans le catalogue actif) :
`portfolio_5/20/50` → `portfolio_10/50/300` ; `first_follower/popular_30/
influencer_100/star_500` → `follower_100/500/2500/15000` ; `first_review/
well_rated/excellent/perfect`, `first_booking/pro_10/expert_50/master_100`,
`visit_10/50/250/1000` → absorbés dans le score de spécialité (métier) ;
`top_10` → `top_1_percent` ; `specialty_reference` → remplacé par le vrai
système de niveaux métier par spécialité.

`chair_score` = somme intégrale des badges carrière/exceptionnels débloqués
+ agrégat pondéré des scores de spécialité. Plus besoin de filtrer par
catégorie pour éviter un double comptage : depuis le retrait des badges
globaux avis/visites/réservations, plus aucun recoupement entre les deux
domaines n'existe.

`/pro/badges` refondu autour de 5 sections : Ma progression, Expertise
métier (une carte par spécialité avec CTA actionnable — "Ajoutez N
réalisations pour progresser vers X"), Prochain badge à débloquer, Carrière,
Badges exceptionnels.

## Ce qui est livré vs. V3 (prochaine passe)

**Livré (2026-07-10, deux sessions)** : modèle de données par spécialité,
score pondéré plafonné, niveaux métier avec paliers relatifs (local +
régional, anti-fraude), classements ville/département/région/France, profil
public avec highlights limités (1-3 signaux), QR avec choix de spécialité,
fallback gérant, restructuration complète des badges en 3 familles
(métier/carrière/exceptionnels), page `/pro/badges` refondue.

**V3 (pas fait)** :
- **Home CHAIR client personnalisée** — utiliser les préférences onboarding (genre, spécialités), le comportement récent (recherches, favoris, abonnements, temps passé) pour que deux utilisateurs ne voient jamais la même home. Gros chantier séparé, pas commencé.
- **Dashboard CHAIR PRO cockpit V2** — aligner `/pro` (déjà refondu une fois le 2026-07-10) avec les nouvelles données : meilleure spécialité, rang local, prochain badge métier, en réutilisant `/my-specialty-progress` et le `next_step` déjà calculé côté backend.
- Intégration logiciels de réservation tiers (Planity...) pour l'attribution salarié.
- Programme ambassadeur (aucune donnée n'existe — `ambassador_program`/`ambassador_national` resteront verrouillés tant qu'il n'est pas construit).
- Retuning des seuils `BadgeService::LEVELS` (les 6 paliers CHAIR globaux, distincts des niveaux par spécialité) — pas demandé, le plafond de score a changé plusieurs fois depuis leur dernier calibrage.
