# Données de démonstration — frontière exacte et plan de mise au propre

> Mesures réalisées le **25/08/2026** sur la **base locale** (`chair_app`, MySQL
> local — même seed `chair:demo-reset` que la production). Avant toute action en
> production, relancer les requêtes de la section 1.4 sur la base Infomaniak :
> les chiffres peuvent différer si des vrais utilisateurs se sont inscrits.
> **Aucune donnée n'a été modifiée** — ce document mesure et propose, la
> décision appartient à Julien.

## 1. Frontière démo / réel — chiffres exacts

**Critère de frontière** : un compte est « démo » si son email se termine par
`@demo.getchair.app` (convention du seed `chair:demo-reset`, qui crée tous ses
comptes ainsi). Tout le reste est « réel ».

### 1.1 Comptes

| | Nombre |
|---|---|
| Comptes totaux | **111** |
| Comptes démo (`@demo.getchair.app`) | **108** = 66 coiffeurs + 30 clients + 12 gérants |
| Comptes **non-démo** (liste nominative complète ci-dessous) | **3** |

Liste nominative des comptes non-démo :

| ID | Nom | Email | Rôle |
|---|---|---|---|
| 24 | Julien SCHILLINGER | julien.schillinger06@gmail.com | hairdresser (profil `julien-schillinger`, id 8) |
| 54 | Koehler Antoine | test999@gmail.com | salon_owner (profil `koehler-antoine`, id 27) |
| 738 | Julien | julien@getchair.local | admin (backoffice, admin_role_id 1) |

⚠️ Deux points à noter sur ces comptes réels :
- **L'email d'Antoine est `test999@gmail.com`** — un email jetable de test, pas
  son vrai email. À corriger avant soumission (changement d'email dans l'app ou
  en base), sinon toute notification/récupération de mot de passe part dans le vide.
- Le seed préserve les comptes par **nom** (`%schillinger%` / `%koehler%`) et
  par `admin_role_id`, pas par email : cohérent avec la liste ci-dessus.

Cas particulier côté démo : le compte démo **Lina Benali** (profil coiffeur
id 216) a le rôle `salon_owner` tout en ayant un profil coiffeur — anomalie
mineure du seed, sans impact visible.

### 1.2 Contenus

| Élément | Total | Démo | Réel (rattaché aux 3 comptes) |
|---|---|---|---|
| Profils coiffeur | 69 | **67** (49 indépendants, 18 salariés) | 2 (`julien-schillinger`, `koehler-antoine`) |
| Salons | 14 | **12** | 2 : « Koehler Coiffeur » (id 9), « CHAIR Studio Paris » (id 14) — tous deux au gérant Antoine (#54) |
| Réalisations (posts) | 302 | **295** | 7 (toutes sur `julien-schillinger`, publiées) |
| Avis | 224 | **224** (auteur démo → coiffeur démo) | 0 |
| Offres d'emploi | 16 | 16 | 0 |
| Locations de fauteuil | 8 | 8 | 0 |
| Abonnements (follows) | 719 | 719 | 0 |
| Stories / candidatures / demandes de location / RDV | 0 | — | — |

### 1.3 Cas frontière réel ↔ démo : **aucun**

Mesuré par jointures sur `reviews` et `appointments` :

- Avis d'un **auteur réel sur un coiffeur démo** : **0**
- Avis d'un auteur démo sur un coiffeur réel : **0**
- Avis sur les profils réels (Julien, Antoine) : **0**
- Rendez-vous croisés réel↔démo : **0** (la table `appointments` est **vide** : 0 RDV au total)

La frontière est donc **parfaitement propre** en local : purger par email
`@demo.getchair.app` ne toucherait aucune donnée réelle et ne laisserait aucun
orphelin côté avis/RDV.

### 1.4 Requêtes de vérification (à rejouer sur la prod avant toute action)

```sql
-- Comptes non-démo (liste nominative)
SELECT id, name, email, role, admin_role_id FROM users
WHERE email NOT LIKE '%@demo.getchair.app' ORDER BY id;

-- Avis d'auteurs réels sur des coiffeurs démo (cas frontière à recompter)
SELECT COUNT(*) FROM reviews r
JOIN users cu ON cu.id = r.client_id
JOIN hairdresser_profiles hp ON hp.id = r.hairdresser_id
JOIN users hu ON hu.id = hp.user_id
WHERE cu.email NOT LIKE '%@demo.getchair.app'
  AND hu.email LIKE '%@demo.getchair.app';

-- RDV croisés réel↔démo
SELECT COUNT(*) FROM appointments a
JOIN users cu ON cu.id = a.client_id
JOIN hairdresser_profiles hp ON hp.id = a.hairdresser_id
JOIN users hu ON hu.id = hp.user_id
WHERE (cu.email LIKE '%@demo.getchair.app') <> (hu.email LIKE '%@demo.getchair.app');
```

## 2. Trois options — décision Julien

Les trois options sont présentées avec leurs conséquences ; **aucune n'est
« la bonne » d'office**. Le paramètre clé côté Apple : une app qui paraît vide
est un risque de rejet **2.1** (app incomplète), et une preuve sociale
massivement fabriquée est un risque **2.3.1** (contenu trompeur) — et surtout
contraire à la position d'honnêteté défendue par Julien.

### Option A — Base démo réduite et crédible (~15-20 coiffeurs, Strasbourg/Haguenau)

Garder uniquement les coiffeurs démo de Strasbourg (15) et Haguenau (13) — ou
un sous-ensemble — avec le nouveau pool d'avis varié, purger les 38 autres
villes (1 à 5 coiffeurs par ville : ces villes paraissent de toute façon quasi
vides à l'usage).

- **Reviewer** : l'app reste vivante là où le reviewer regardera (recherche par
  défaut, feed, classement). Une recherche sur « Paris » ou « Lyon » rendra
  0-1 résultat — défendable pour un lancement régional revendiqué (notes de
  review : « lancement Alsace »), mais à assumer dans le texte de soumission.
- **Effort** : moyen — adapter `chair:demo-reset` (réduire `CITIES` aux villes
  alsaciennes) puis relancer le seed, OU écrire une purge ciblée par ville.
  ~1-2 h de dev + re-seed.
- **Crédibilité** : bonne — une densité réelle sur une zone réelle est plus
  crédible que 3 coiffeurs par métropole.
- **Honnêteté** : le contenu reste fabriqué mais à échelle modeste et
  cohérente avec un vrai lancement local.

### Option B — Garder la base actuelle (108 comptes, 18 villes) avec avis diversifiés

Relancer `chair:demo-reset` avec le nouveau pool (63 textes, notes
hétérogènes) sans toucher à la géographie.

- **Reviewer** : app dense partout, aucune zone vide. C'est le moindre risque
  2.1. Risque 2.3.1 réduit par la diversification des avis (plus de doublons
  mot à mot côte à côte) mais pas nul : 108 faux profils restent 108 faux
  profils si un reviewer creuse.
- **Effort** : minimal — le pool est déjà en place dans `DemoReset.php`, une
  seule commande à lancer (voir §4, destructive).
- **Crédibilité** : moyenne — 2-5 coiffeurs par grande ville, c'est peu pour
  une app qui semble nationale.
- **Honnêteté** : c'est l'option avec le plus de preuve sociale fabriquée
  (719 abonnements, 224 avis, 295 réalisations recyclées). À mettre en regard
  de la position exprimée par Julien contre la preuve sociale massive.

### Option C — Purge totale + vrais pros embarqués avant soumission

Supprimer tous les comptes `@demo.getchair.app` et remplir l'app avec de vrais
salons/coiffeurs recrutés (Koehler Coiffeur en tête) avant la soumission.

- **Reviewer** : c'est l'option **la plus risquée en 2.1** si le recrutement
  n'aboutit pas à temps : une marketplace avec 2 profils et 0 avis paraît
  cassée, pas honnête. Elle ne devient viable qu'avec un socle réel suffisant
  (ordre de grandeur : 10+ pros actifs avec photos et prestations).
- **Effort** : élevé et **non technique** — le blocant est le recrutement
  terrain de pros avant la date de soumission, pas le code (la purge, elle,
  est triviale : les requêtes du §1.4 prouvent qu'elle est propre).
- **Crédibilité / honnêteté** : maximales — rien de fabriqué. C'est l'état
  cible à terme quoi qu'il arrive ; la question est uniquement le calendrier.

**Piste hybride à considérer** (à valider par Julien) : option A maintenant
pour TestFlight/review, avec migration progressive vers C au fil du
recrutement — les comptes démo sont purgeables à tout moment sans toucher au
réel (frontière propre, §1.3).

## 3. Ce qui a été fait dans le code (ce sprint)

`backend/app/Console/Commands/DemoReset.php` :

1. **Pool d'avis : 9 → 63 textes** (`REVIEW_COMMENTS_POSITIVE`, 49 textes,
   notes 4-5 ; `REVIEW_COMMENTS_NUANCED`, 14 textes, note 3). Longueurs de
   7 à 84 caractères (« Très bien. » → récits détaillés), ton naturel, sans
   superlatifs uniformes, sans coordonnées ni insulte. **Les 63 textes passent
   `ContentFilter::check()`** (vérifié par script le 25/08/2026 : 0 refus,
   0 doublon).
2. **Cohérence note/texte** : un avis 3★ pioche désormais dans le pool nuancé,
   un 4-5★ dans le pool positif — fini le « Résultat au top » noté 3.
3. **Moyennes hétérogènes** : chaque coiffeur reçoit un « tempérament » de
   notation (correct / bon / très bon / excellent) qui étale les moyennes de
   ≈3.0 à 5.0 (simulation sur 66 coiffeurs : étalement 3.0 → 5.0, moyenne
   globale ≈4.4, les 5.0 restant réservés aux profils à peu d'avis — crédible).

**Rien n'a été exécuté** : `chair:demo-reset` est destructif et reste une
décision de Julien (voir §4).

## 4. Procédure d'application (le jour J, décision prise)

```bash
# 1. Dry-run (aucune modification) — liste ce qui serait gardé/supprimé
php artisan chair:demo-reset

# 2. Exécution réelle (DESTRUCTIF : purge + re-seed complet)
php artisan chair:demo-reset --force
php artisan chair:backfill-badges
```

Interdits absolus :
- **Jamais pendant une fenêtre de review Apple** (le compte de review créé
  pour Apple serait supprimé — il n'est ni admin ni nommé Schillinger/Koehler).
- Jamais sans avoir rejoué les requêtes du §1.4 en production d'abord.
- Corriger l'email `test999@gmail.com` d'Antoine (#54) **avant** la soumission.
