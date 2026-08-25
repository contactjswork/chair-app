# CHAIR CLIENT — État final avant soumission App Store

**Établi le 24 août 2026**, par vérification du code réel en fin de session — pas par relecture
des documents précédents. Chaque état ci-dessous a été confirmé en ouvrant le fichier.

> **Le code bougeait pendant cette vérification.** Des intervenants parallèles ont livré des
> correctifs entre le début et la fin de cette passe. Les états retenus sont ceux constatés **en
> dernier**. Si le travail continue après la rédaction de ce document, il faut le refaire.

---

## Conclusion

# NOT READY

**L'app ne peut pas être soumise aujourd'hui.** Six points bloquants restent ouverts. Quatre
d'entre eux ne dépendent d'aucun développement : ils attendent une information ou une décision
que seul le gérant peut donner.

Une phrase, s'il n'y en a qu'une à retenir : **rien de ce qui a été corrigé n'est commité ni
déployé, et l'app iOS ne charge que la production — donc, du point de vue d'App Review, aucune de
ces corrections n'existe encore.**

Ce document ne prédit pas la décision d'Apple. Il constate que les conditions minimales d'une
soumission défendable ne sont pas réunies.

---

## 1. Décompte des bloquants

**6 BLOCKER ouverts.**

| # | Bloquant | Nature | Qui le lève | Preuve du constat |
|---|---|---|---|---|
| 1 | **Rien n'est commité ni déployé** | Opérationnel | Dev + déploiement | `git status` : 69 fichiers modifiés, 20 non suivis, zéro commit |
| 2 | **Aucun filtrage des contenus au dépôt** (guideline 1.2) | Développement | Dev | Validation de format seule : `VisitController.php:216`, `AppointmentController.php:577` et `:644`. Grep `badwords\|blacklist\|profanity\|ContentFilter` dans `backend/app/` : aucun résultat |
| 3 | **Aucun email ne part en production** (guideline 2.1) | Configuration | **Gérant** | `ACCOUNT_AUDIT.md` §7 : `POST /forgot-password` répond 200, `MailService` journalise « mailer non configuré ». `.env` local en `MAIL_HOST=mailhog` ; production non vérifiable d'ici |
| 4 | **L'éditeur n'est pas identifié** (5.1.1(i) + RGPD art. 13) | Information | **Gérant** | `CONTROLLER` (5 champs) dans `app/confidentialite/page.tsx` et `PUBLISHER` / `HOST` / `MEDIATOR` dans `app/mentions-legales/page.tsx` : **tous à `null`** |
| 5 | **Compte de review non créé** (guideline 2.1) | Opérationnel | **Gérant** | Aucun compte dédié ; la réservation, les favoris et les avis exigent un compte |
| 6 | **Contenu de la base de production non tranché** (2.3.1) | Décision | **Gérant** | `DemoReset.php` génère des profils `@demo.getchair.app` ; `next.config.ts:168-169` autorise encore `images.unsplash.com` et `i.pravatar.cc` |

**4 HIGH ouverts** — pas bloquants au sens strict, mais chacun est un motif de rejet plausible.

| # | Constat | Pourquoi ça reste ouvert |
|---|---|---|
| H-4 | Risque « site web reconditionné » (4.2) | Un seul plugin natif, pas de push, pas de mode hors ligne. Les Universal Links ont leur **socle web posé** mais restent inactifs : la route AASA renvoie 404 tant que `APPLE_TEAM_ID` manque, et la capability *Associated Domains* n'est pas ajoutée (`DEEPLINKS_SETUP.md`) |
| H-1 | Chemin vers l'abonnement CHAIR PLUS (3.1.1(a)) | Atténué : les cinq liens `/pro` sont en `target="_blank"` → Safari. **Jamais confirmé sur appareil réel** |
| B-2 | Portée du blocage (1.2) | Fil, recherche, exploration et recommandations filtrés ; **fiche publique et classements non** |
| — | Étiquettes de confidentialité App Store Connect | À remplir ; le tableau est prêt dans `APP_PRIVACY_MAPPING.md` §2 |

---

## 2. Ce qui a été corrigé — vérifié fichier par fichier

### Conformité UGC (guideline 1.2)

| Correction | Preuve |
|---|---|
| Signalement de contenu | `POST /api/reports` (`throttle:15,60`) → `ReportController`. 6 motifs, types `post\|review\|profile\|user`. UI : `ReportSheet.tsx` + `ContentMenu` posés sur `coiffeur/[slug]:111`, `feed:275`, `realisation/[id]:136`, et `PublicProfileReviews:115` pour les avis |
| Blocage d'un compte | `POST`/`DELETE /users/{id}/block`, `GET /my-blocks` → `UserBlockController`, modèle `UserBlock`, migration `2026_08_24_100000`. Filtrage effectif dans `HairdresserController:380` (fil), `SearchController:80` et `:204`, `ExploreController:77`, `RecommendationController:57` |
| Règles de communauté publiées | `app/app/regles-communaute/page.tsx` — interdits explicites, procédure de signalement, section 9 listant les comptes bloqués avec déblocage |

### Confidentialité et permissions

| Correction | Preuve |
|---|---|
| Politique de confidentialité réécrite (v1.1) | Sous-traitants réellement appelés nommés ; plus de « Privacy Shield » ; plus d'« achats in-app » ; §12 dit que cette version n'envoie pas de push ; §4 décrit le parcours de géolocalisation réel |
| Géolocalisation contextualisée (5.1.1(iv)) | `GeoPermissionModal.tsx` : `GEO_RELEVANT_PATH = '/app/recherche'`, sortie immédiate ailleurs, alerte système sur tap explicite uniquement |
| Textes de permission iOS (5.1.2) | Les trois textes d'`Info.plist` décrivent l'usage client et tutoient. `sync-ios-chair.sh` et le workflow client de `codemagic.yaml` (lignes 42-43, 96-100) sont **alignés** — ils écrasaient la correction avant |
| Privacy manifest (ITMS-91053) | `PrivacyInfo.xcprivacy` créé, `NSPrivacyTracking=false`, `UserDefaults`/`CA92.1`, **et rattaché à la cible** — `project.pbxproj:16` et `:148` |
| Bandeau de stockage local | `CookieBanner.tsx:53` : invisible en natif, et remplacé sur le web par une information (le bouton « Refuser » ne changeait rien — faux consentement) |

### Complétude de l'app (guideline 2.1)

| Correction | Preuve |
|---|---|
| Suppression de compte conforme | `AuthController::deleteAccount:312-373` — transaction ; purge des avis, rendez-vous, notifications, favoris, abonnements (avec recalcul de `followers_count`), publications enregistrées, likes, jetons push, préférences de notification et de style, partages, demandes de support et stories ; anonymisation de `profile_views.viewer_user_id` ; `scrubHairdresserProfile()` ; révocation des jetons ; anonymisation de la ligne `users`. Textes alignés : `/app/compte/supprimer` et `cgu:172` disent « immédiate », plus de « 30 jours » |
| **Annulation de rendez-vous côté client** | `PUT /appointments/{id}/cancel` → `AppointmentController::clientCancel` ; bouton « Annuler ce rendez-vous » dans `/app/compte:636`. La FAQ ne décrit plus une fonction absente |
| L'app ne se décrit plus comme inachevée | `not-found.tsx:15` renvoie vers `/app` en natif ; `AppDownload.tsx:59` retourne `null` en natif ; le logo du header mobile pointe `/app` (`TopNav.tsx:31`) |
| CGU exactes | Plus de « réservation en cours de déploiement » ; Stripe/CHAIR PLUS décrits comme relevant de l'espace pro et « ni proposés ni accessibles depuis l'application » client (`cgu:160`) |
| Coordonnées cohérentes | `frontend/lib/contact.ts` — source unique (`contact@getchair.app`, horaires, délais), importée par l'aide, les règles de communauté, `/contact`, les mentions légales, le pied de page et la landing |
| Page de mentions légales | `app/mentions-legales/page.tsx` créée, liée depuis le pied de page, exemptée du portail bêta |
| Liens morts retirés | `SOCIAL_LINKS` à `null` dans `lib/contact.ts` : plus de liens vers `instagram.com`/`tiktok.com` sans handle |

### Cible et distribution

| Correction | Preuve |
|---|---|
| iPad retiré | `TARGETED_DEVICE_FAMILY = "1"` sur les deux configurations (`project.pbxproj:316`, `:337`). Aucune capture iPad ne sera exigée |
| URL publiques accessibles | `proxy.ts` : `/contact` (ligne 54) et `/mentions-legales` (ligne 53) rejoignent `/cgu` et `/confidentialite` dans les exemptions du portail bêta |
| Chemin de paiement atténué | Les cinq liens `/pro` de l'app client portent `target="_blank" rel="noopener noreferrer"` (`compte:148,220,231,474`, `ProfileActions:170`) |
| Bypass de login supprimé | `AuthContext.tsx:75` : `NEXT_PUBLIC_AUTH_BYPASS` retiré |

---

## 3. Ce qui reste ouvert, par catégorie

### Développement (2)

- **Filtrage des contenus au dépôt** — B-3. La spécification existe déjà : la section 2 de
  `/app/regles-communaute` liste ce qui est interdit.
- **Portée du blocage** — B-2. Étendre le filtrage à `HairdresserController::index`, `::show` et
  aux classements, ou assumer la portée actuelle et la décrire telle quelle dans les notes de
  review (c'est ce que fait la rédaction actuelle).

### Action gérant (7)

Toutes détaillées dans **`ACTION_GERANT.md`** : identité juridique et hébergeur · SMTP de
production · compte de review · confirmation de l'adresse de contact et réseaux sociaux ·
décision Stripe / CHAIR PLUS · Apple Team ID · déclaration de chiffrement.

### Qualité, non bloquant (6)

- `/app/compte:122-123` et `:146` vouvoient encore ; `ReportSheet:119` dit « votre signalement »
  au milieu d'une feuille qui tutoie
- `/app/aide:175` affiche « CHAIR · Version 1.0 » en dur
- Trois liens vers `/` subsistent dans `/app/scan/[token]` et `/app/avis/[token]`
- `/download` n'a aucun garde natif (mais n'affiche plus de boutons de store en natif)
- `next.config.ts` autorise encore `images.unsplash.com` et `i.pravatar.cc`
- L'écran de préférences de notification parle de push système, absent de ce build
- `/confidentialite` §13 décrit le signalement mais pas le blocage
- Universal Links inactifs : les QR `/app/scan/[token]` ouvrent Safari, pas l'app — il manque
  `APPLE_TEAM_ID` et la capability *Associated Domains* (`DEEPLINKS_SETUP.md`)

---

## 4. Pourquoi NOT READY, et pas « presque prêt »

Trois raisons, dans l'ordre de gravité.

**1. Le décalage entre le dépôt et la production.** L'app iOS est une WebView qui charge
`https://www.getchair.app/app`. Tout ce qui a été corrigé — signalement, blocage, règles de
communauté, politique de confidentialité, annulation de rendez-vous, mentions légales — vit dans
un working tree non commité. Un reviewer qui ouvre l'app aujourd'hui ne verrait rien de tout cela.
Ce n'est pas une nuance de calendrier : c'est la différence entre une app conforme et une app qui
ne l'est pas.

**2. Deux bloquants dépendent d'une information que personne d'autre que le gérant ne détient.**
L'identité juridique de l'éditeur et les identifiants SMTP ne sont pas des tâches en attente : ce
sont des trous que le code a préparés pour eux (`CONTROLLER`, `PUBLISHER`, `HOST`, variables
`MAIL_*`) et qui restent vides. **Tant qu'une dépendance humaine reste ouverte, l'app n'est pas
prête — quelle que soit la qualité du code.**

**3. Le filtrage des contenus reste absent.** La guideline 1.2 énumère quatre exigences pour une
app à contenu utilisateur. Trois sont désormais satisfaites — signalement, blocage, coordonnées
publiées. La quatrième, « a method for filtering objectionable material from being posted », n'a
aucun début d'implémentation. C'est la seule des quatre qui demande du code neuf.

Le reste — 4.2, la portée du blocage, le chemin vers CHAIR PLUS — relève de l'appréciation d'un
reviewer et ne peut pas être garanti dans un sens ou dans l'autre. Ces points sont documentés pour
qu'un rejet éventuel soit compris et corrigible, pas pour promettre qu'il n'arrivera pas.

---

## 5. Ordre de travail recommandé

1. **Gérant** : `ACTION_GERANT.md` entrées 1 à 4 (identité, SMTP, compte de review, contact). Ce
   sont les plus longues à obtenir et elles ne dépendent de personne d'autre.
2. **Dev** : filtre lexical au dépôt des avis et des réponses pros (B-3).
3. **Gérant** : trancher le contenu de la base de production (entrée 9) et la décision
   Stripe / CHAIR PLUS (entrée 5).
4. **Dev** : arbitrer la portée du blocage (B-2) — étendre, ou figer la rédaction des notes de
   review sur la portée réelle.
5. **Commit, revue, déploiement en production.**
6. **Test sur iPhone physique** avec le build soumis : `APPLE_REVIEW_CHECKLIST.md` §5. C'est là
   que se confirment H-1 (ouverture dans Safari), M-1 (position), et la nouvelle annulation de
   rendez-vous.
7. **Remplir App Store Connect** : `APP_STORE_CONNECT_METADATA.md`, `APP_PRIVACY_MAPPING.md` §2,
   `APPLE_REVIEW_NOTES.md`.
8. **Téléversement TestFlight avant la soumission**, pour récupérer les emails automatisés
   (ITMS-*) pendant qu'ils ne coûtent rien.

---

## 6. Ce document n'est pas une prédiction

Apple applique ses règles au cas par cas. Une app conforme sur tous les points listés ici peut
être refusée, et une app qui ne l'est pas peut passer. Ce que dit ce document, c'est où se situe
CHAIR par rapport aux règles publiées le 24 août 2026 — et que dans cet état, soumettre revient à
demander un rejet.

---

## Addendum — passe de consolidation finale

Corrections appliquées après la rédaction initiale de ce document, en réponse
aux points laissés ouverts par les agents (chacun testé, aucun poussé) :

**B-2 — Portée du blocage.** Étendue à `HairdresserController::index` (liste
principale des coiffeurs). Vérifié en curl : recherche « Julien SCHILLINGER »
→ 1 résultat avant blocage, 0 après, 1 après déblocage ; un visiteur anonyme
n'est jamais affecté. La fiche ouverte par lien direct affiche désormais un
bandeau « Tu as bloqué ce compte » avec déblocage en un tap
(`components/ui/BlockedProfileNotice.tsx`), plutôt qu'un 404 qui casserait les
liens partagés d'un annuaire professionnel public. **Restent non filtrés : les
classements** — à décrire tel quel dans les notes de review.

**B-3 — Filtrage au dépôt.** `app/Services/ContentFilter.php` créé et branché
sur les 3 points de dépôt d'avis (`VisitController::submitReview`,
`AppointmentController::submitReview` et `::reviewByToken`) et sur les 4 points
de dépôt de réalisation (`PostController`). Refuse insultes et termes haineux
(y compris maquillés : accents, « leet », séparateurs) et coordonnées en clair
(e-mail, téléphone, URL). 19 cas unitaires au vert, sans faux positif sur le
vocabulaire de coiffure (« bordure », « queue de cheval », « pénétrant »).
Vérifié en HTTP réel : 422 avec message français sur les trois cas interdits,
201 sur un avis légitime. **Ce filtre n'analyse pas les images** — à dire tel
quel dans les notes de review.

**CHAIR Business.** La page `/pro/salon/business` (49,99 €/mois, Stripe)
exposait encore tarif et bouton de souscription dans le binaire client. Même
verrou que CHAIR+ appliqué, via un composant partagé
(`components/pro/SubscriptionElsewhereState.tsx`) qui remplace la copie
dupliquée de `/pro/chair-plus`.

**Divers.** `/.well-known` exempté du portail bêta (sans quoi Apple mettrait
en cache un AASA en échec) ; `contact@getchair.app` unifié dans les CGU, la
politique de confidentialité et la feuille de signalement ; trois liens de
`/app/scan` et `/app/avis` qui éjectaient vers la vitrine redirigés vers
`/app` ; `capacitor.config.ts` resynchronisé ; `returnTo` post-authentification
honoré pour tous les rôles avec contrôle de cohérence rôle/destination ;
`PrivacyInfo.xcprivacy` rattaché à la cible Xcode ; bypass de login et sa
variable d'environnement entièrement retirés.

---

## Addendum vague 3 — 25/08/2026

### Guideline 4.2 (Minimum Functionality) — verdict : **MEDIUM, en nette baisse**

**Ce qui joue POUR l'app** (vérifié en rendu réel) : géolocalisation native
Capacitor ; navigation par onglets avec badge ; bottom sheets à geste ; safe
areas partout ; plus aucun flash gris au tap (`-webkit-tap-highlight-color`) ;
plus de sélection de texte ni de menu copier sur l'UI (contenu textuel toujours
sélectionnable) ; plus de rebond élastique du document ; plus de pinch-zoom sur
l'UI ; scrollbars masquées ; aucun chrome web en natif (footer, bannière
« télécharge l'app », bandeau cookies — tous gatés par la classe `chair-native`
posée avant le premier paint) ; bottom nav retirée quand le clavier iOS est
ouvert ; page d'erreur réseau locale DA CHAIR avec bouton Réessayer
(`server.errorPath`, embarquée dans le binaire — **effective au prochain
build**) ; annulation de rendez-vous in-app ; signalement/blocage in-app.

**Ce qui reste CONTRE** : architecture site distant (zéro code embarqué,
contenu identique au site) ; pas de push (OneSignal retiré) ; pas de mode
hors-ligne au-delà de l'écran d'erreur ; la réservation d'un coiffeur salarié
sort vers Safari (assumé et annoncé avant le clic).

**Pourquoi MEDIUM et pas HIGH** : le reviewer sur iPhone ne voit plus aucun
signal webview évident, l'app est iPhone-only (le rendu « site desktop » de
l'iPad est hors jeu), et le service est substantiel (réservation réelle, avis
certifiés QR, annuaire). **Pour descendre à LOW** : réintégrer le push (mesure
n°1), embarquer un build de repli, `@capacitor/browser` pour les sorties.

### Corrections vague 3 (toutes testées)
- returnTo généralisé : s'abonner, sauvegarder, j'aime, modale du feed,
  inspirations, favoris, notifications — plus aucune perte de contexte à la
  connexion. Login loop : vérifié absent.
- Erreurs humanisées en français (`humanizeErrorMessage`) + réseau coupé géré.
- Concurrence prouvée en bi-processus : double booking (201+409, 1 ligne),
  double annulation, double blocage, double signalement, double suppression —
  aucun 500, états cohérents. Throttles compatibles usage reviewer.
- Timezone : heures murales Europe/Paris de bout en bout, DST du 25/10/2026
  testé, jour même géré. Clavier : CTA atteignables mesurés à 375×476.
- Filtre par champ : bio/tagline = insultes seulement (un pro peut donner son
  téléphone) ; avis/légendes = insultes + coordonnées. Pluriel maquillé corrigé.
- A11y : dialogues aria-modal, aria-label FR sur tous les icon-only, aria-busy.
- **Zéro mention CHAIR+/CHAIR Business côté client** (décision Julien) :
  badge retiré des cartes de recherche/feed/classements/recommandations,
  pastille salon remplacée par le sceau, description du badge « Certifié
  CHAIR » corrigée en base par migration, FAQ reformulée. Les seules
  occurrences restantes vivent dans l'espace pro, derrière le verrou
  `allowsDigitalSubscriptionUI`.

### Blockers restants : 4 — tous côté gérant
1. Identité juridique éditeur + hébergeur (constantes à `null`).
2. SMTP de production (mot de passe oublié inopérant pour un reviewer).
3. Compte de review à créer sur la production (`APPLE_REVIEW_ACCOUNT_SETUP.md`).
4. Déployer : l'app iOS charge `www.getchair.app` — rien de ce working tree
   n'existe pour Apple avant le déploiement (front + backend SSH + migrations)
   **et un build TestFlight** (marqueurs UA, page d'erreur locale, purpose
   strings, iPhone-only, PrivacyInfo).

Conclusion : **NOT READY** tant que les 4 points ci-dessus ne sont pas faits —
**le code, lui, est prêt.**
