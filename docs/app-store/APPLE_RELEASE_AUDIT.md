# CHAIR CLIENT — Audit de conformité App Store

**App auditée :** CHAIR (client) — bundle `app.getchair.client`
**Première rédaction :** 24 août 2026 · **Révision contre le code réel :** 24 août 2026, fin de session
**Méthode :** lecture du code source (frontend Next.js, backend Laravel, projet Xcode). Chaque
état ci-dessous a été **re-vérifié fichier par fichier** au moment de cette révision. Ce qui n'a
pas pu être confirmé est marqué **incertain** et dit pourquoi.
**Référentiel :** App Store Review Guidelines, consultées le 24 août 2026.

> **Avertissement.** Ce document compare le code aux règles publiées par Apple. Il ne prédit pas
> la décision d'App Review : Apple applique ses règles au cas par cas, peut refuser une app par
> ailleurs conforme et en accepter une qui ne l'est pas. **Rien ici ne garantit une acceptation.**

> **Où en est le code.** Toutes les corrections décrites sont dans le **working tree** de `main`.
> Au moment de cette révision, `git status` ne montre **aucun commit** : 69 fichiers modifiés et
> 20 non suivis. L'app iOS n'embarque aucun code — elle affiche `https://www.getchair.app/app`.
> **Tant que ce n'est pas déployé, rien de ce qui suit n'existe pour App Review.**

> **Le code a bougé pendant la rédaction.** Plusieurs correctifs ont été livrés par des
> intervenants parallèles **entre le début et la fin de cette révision** : source unique de
> contact (`frontend/lib/contact.ts`), page `/mentions-legales`, annulation de rendez-vous côté
> client, extension du filtrage de blocage à la recherche et aux recommandations, exemption de
> `/contact` et `/mentions-legales` du portail bêta. Les états ci-dessous ont été **re-vérifiés
> après ces livraisons**. Un nouveau passage sera nécessaire si le travail parallèle continue.

---

## 1. Cartographie factuelle

### 1.1 Ce qu'est l'app iOS, techniquement

| Fait | Valeur | Source | Vérifié |
|---|---|---|---|
| Bundle ID | `app.getchair.client` | `capacitor.chair.config.ts`, `project.pbxproj:308`, `:329` | oui |
| Nom affiché | CHAIR | `Info.plist` → `CFBundleDisplayName` | oui |
| Langue de développement | `fr` | `Info.plist` → `CFBundleDevelopmentRegion` | oui |
| Version / build | `1.0.0` / `1` | `project.pbxproj:306`, `:299` | oui |
| Cible | **iPhone seul** — `TARGETED_DEVICE_FAMILY = "1"` sur les deux configurations | `project.pbxproj:312`, `:333` | oui |
| Déploiement minimum | iOS 15.0 | `project.pbxproj:233` | oui |
| Mode Capacitor | `server.url` distant — la WebView charge `https://www.getchair.app/app`, rien n'est embarqué | `capacitor.chair.config.ts` | oui |
| Navigation autorisée | `getchair.app`, `www.getchair.app` | idem, `allowNavigation` | oui |
| Plugins natifs | `@capacitor/geolocation` **uniquement** (9 dépendances runtime au total) | `package.json` | oui |
| Push natif | **absent** — aucun SDK côté app ; OneSignal existe côté serveur seulement | `NotificationService.php`, aucune occurrence dans `frontend/` | oui |
| Universal links | **socle web posé, inactif** — la route `app/.well-known/apple-app-site-association/route.ts` sert le JSON, mais renvoie **404 tant que `APPLE_TEAM_ID` est absente**. Côté natif : capability *Associated Domains* et nouveau build encore à faire | `frontend/app/.well-known/…/route.ts`, `DEEPLINKS_SETUP.md` | oui |
| Privacy manifest | `PrivacyInfo.xcprivacy` présent **et rattaché à la cible** (`Copy Bundle Resources`) | `project.pbxproj:16`, `:148` | oui |
| `ITSAppUsesNonExemptEncryption` | **non déclarée** dans `Info.plist` | `Info.plist` | oui (voir M-8) |
| Orientation | portrait iPhone. Une clé `UISupportedInterfaceOrientations~ipad` subsiste, sans effet avec la famille `"1"` | `Info.plist` | oui |

### 1.2 Routes du périmètre client

L'app démarre sur `/app`. Espace client : `/app`, `/app/recherche`, `/app/feed`, `/app/favoris`,
`/app/inspirations`, `/app/coiffeur/[slug]`, `/app/coiffeur/[slug]/reserver`, `/app/salon/[slug]`,
`/app/realisation/[id]`, `/app/classements`, `/app/objectifs`, `/app/recrutement`,
`/app/notifications`, `/app/notifications/preferences`, `/app/compte`, `/app/compte/modifier`,
`/app/compte/supprimer`, `/app/aide`, **`/app/regles-communaute`** (nouvelle), `/app/avis/[token]`,
`/app/scan/[token]`, `/app/onboarding`.

Pages hors `/app` utilisées par l'app : `/connexion`, `/inscription`, `/mot-de-passe-oublie`,
`/reinitialiser-mot-de-passe`, `/cgu`, `/confidentialite`, **`/mentions-legales`** (créée pendant
la session), `/contact`, `/` (vitrine), `/parrainage/[code]`, `/fauteuil/[slug]`, `/download`.

Hors périmètre client mais sur le même host, donc atteignables : `/pro/**` (CHAIR PRO) et
`/admin/**` (protégé par cookie, `frontend/proxy.ts`).

### 1.3 Fonctionnalités client réelles

Découverte et recherche géolocalisée · profils coiffeurs et salons · portfolio · avis certifiés
en lecture · réservation de créneau · historique de rendez-vous · favoris et abonnements · fil de
réalisations · likes et enregistrements · dépôt d'avis certifié (QR ou lien) · points, niveaux et
classements · notifications in-app et 10 préférences · édition de profil avec photo · parrainage ·
offres d'emploi en lecture · **annulation d'un rendez-vous à venir** · **signalement de contenu** ·
**blocage de compte** · suppression de compte.

**Absent :** messagerie client↔coiffeur, paiement in-app, notifications push natives, export de
données.

### 1.4 Contenus générés par les utilisateurs

| Contenu | Produit par | Visible par | Modération |
|---|---|---|---|
| Avis (note + 10 à 1000 caractères) | client | tout le monde, hors connexion comprise | signalement utilisateur → file admin ; **aucun filtrage au dépôt** |
| Nom d'affichage + photo de profil | client | attachés à chaque avis | aucune |
| Réponse à un avis | coiffeur | public | aucune |
| Réalisations, stories, bio, prestations, liens sociaux | coiffeur / salon (app PRO) | public dans l'app client | signalement + back-office |
| Offres d'emploi, annonces de fauteuil | salon | public | back-office |

### 1.5 Paiements

Aucun paiement dans l'app client, et l'interface le dit à plusieurs endroits
(`BookingSheet.tsx`, `PublicProfileServices.tsx` : « Le paiement se fait sur place, jamais dans
l'application »). Aucune intégration Stripe, Apple Pay ou StoreKit dans `frontend/app/app/**`.

Cas particulier : un coiffeur salarié peut renseigner un `booking_url` externe. Le bouton
« Réserver sur le site du salon » ouvre ce lien hors de l'app, avec un texte qui le dit. Prestation
physique : 3.1.3(e) l'autorise.

---

## 2. Matrice de conformité

Colonne **État** : `conforme` · `non conforme` · `incertain`.
Colonne **Risque** : BLOCKER / HIGH / MEDIUM / LOW.
Aucune ligne ne préjuge de la décision d'Apple.

| Guideline | Fonction CHAIR concernée | État | Risque | Ce qui reste |
|---|---|---|---|---|
| **1.2 — signalement de contenu répréhensible** | Menu `⋯` → « Signaler », 6 motifs, `POST /reports` authentifié (`throttle:15,60`). Posé sur fiche coiffeur, fil, réalisation, avis | **conforme** (dans le working tree) | BLOCKER si non déployé | Tester sur appareil, vérifier la file `/admin/signalements`, **déployer** — B-1 |
| **1.2 — blocage d'un utilisateur abusif** | `POST/DELETE /users/{id}/block`, `GET /my-blocks`, `BlockConfirmSheet`, liste débloquable sur `/app/regles-communaute`. Filtrage appliqué au fil, à la recherche, à l'exploration et aux recommandations | **incertain sur la portée** | HIGH | La **fiche publique** d'un compte bloqué, la **liste des coiffeurs** et les **classements** ne filtrent pas. Un reviewer qui bloque puis rouvre le profil le retrouve — B-2 |
| **1.2 — filtrage des contenus avant publication** | Dépôt d'avis : validation de **format seulement** (`min:10\|max:1000`) | **non conforme** | **BLOCKER** | Aucun filtre lexical dans `backend/app/` (grep `profanity\|badwords\|blacklist\|ContentFilter` : zéro). Développement à faire — B-3 |
| **1.2 — coordonnées publiées** | `frontend/lib/contact.ts` impose désormais `contact@getchair.app` et les délais annoncés à l'aide, aux règles de communauté, au pied de page, à `/contact` et aux mentions légales | **presque conforme** | MEDIUM | `/confidentialite` et `components/ui/ReportSheet.tsx` affichent encore `hello@getchair.app` en dur ; `MAIL_FROM_ADDRESS` vaut `bonjour@getchair.app`. Reste à confirmer que l'adresse retenue est **relevée** — M-5 |
| **2.1 — App Complete** | FAQ et CGU rendues exactes ; page 404 renvoyant vers `/app` en natif ; « Bientôt sur l'App Store » masqué en natif ; **annulation de rendez-vous côté client livrée** (`PUT /appointments/{id}/cancel` → `AppointmentController::clientCancel`, bouton « Annuler ce rendez-vous » dans `/app/compte`) | **conforme sur ces points** | — | Tester l'annulation sur appareil ; c'est une fonction neuve |
| **2.1 — App Complete** | Compte de review non créé ; SMTP de production non configuré (« mot de passe oublié » répond 200 sans jamais envoyer) | **non conforme** | **BLOCKER** | Créer le compte (`APPLE_REVIEW_CHECKLIST.md` §2) et configurer le SMTP — `ACCOUNT_AUDIT.md` §7 |
| **2.1 / 4.2 — sorties vers la vitrine** | Le logo du header **mobile** pointe désormais `/app` (`TopNav.tsx:31`). Restent trois liens vers `/` dans `/app/scan/[token]` et `/app/avis/[token]`. `/download` n'a toujours aucun garde natif | **conforme sur l'essentiel** | LOW | `AppDownload` se masque en natif, donc plus de « en cours de déploiement » dans l'app. Sorties résiduelles sur deux écrans de bout de parcours — M-9 |
| **2.3 / 2.3.1 — métadonnées exactes, pas de contenu factice** | Base seedée par `chair:demo-reset` (profils coiffeurs `@demo.getchair.app`) ; `next.config.ts` autorise encore `images.unsplash.com` et `i.pravatar.cc` | **incertain** | **HIGH** | Statuer sur le contenu de la base de **production** — H-3 |
| **3.1.1 / 3.1.1(a) — achats intégrés et liens de paiement** | 4 liens vers `/pro` dans `/app/compte` + 1 vers `/pro/profil` dans `ProfileActions`, tous en `target="_blank" rel="noopener noreferrer"` → Capacitor répond par `UIApplication.shared.open` (Safari) | **incertain** | MEDIUM-HIGH | Le chemin in-app vers Stripe est fermé sur le papier (`PAYMENTS_AUDIT.md` §2.1). **À confirmer sur appareil réel.** Reste la FAQ qui évoque « un abonnement pro » et le libellé « Devenir coiffeur sur CHAIR » — H-1 |
| **3.1.3(e) — biens et services physiques** | Prestation réservée dans l'app, payée au salon ; libellés explicites | **conforme** | LOW | Rien. C'est dit dans les notes de review |
| **4.2 — Minimum Functionality** | WebView `server.url` distante, un seul plugin natif, pas de push, pas d'universal links, pas de mode hors ligne | **incertain — risque réel** | **HIGH** | Aucune capacité native ajoutée depuis l'audit initial. Leviers en H-4 |
| **4.8 — connexion avec un service tiers** | Aucun login tiers : email + mot de passe uniquement | **non applicable** | — | L'obligation ne s'ouvre que si Google / Facebook / Apple sont ajoutés |
| **5.1.1(i) — politique de confidentialité** | `/confidentialite` réécrite (v1.1) : sous-traitants nommés, transferts encadrés, mentions fausses retirées. **Mais** `CONTROLLER` vaut `null` sur ses 5 champs | **non conforme** | **BLOCKER** | L'éditeur n'est pas identifié. Blocage humain, pas technique — H-5 |
| **5.1.1(iii) — minimisation** | Inscription : nom, ville, email, téléphone facultatif, mot de passe. Position GPS sur autorisation | **conforme** | LOW | Rien |
| **5.1.1(iv) — consentement d'accès en contexte** | Demande de position uniquement sur `/app/recherche`, après écran d'explication, sur tap explicite | **conforme** | LOW | Re-tester sur appareil après build — M-1 |
| **5.1.1(v) — suppression de compte dans l'app** | `/app/compte` → « Supprimer mon compte » → `/app/compte/supprimer` → saisie de `SUPPRIMER` → `DELETE /api/account` | **conforme** | LOW | Textes alignés sur le comportement réel. Reste un arbitrage sur le sort des avis — M-2 |
| **5.1.2 — partage de données** | Politique nommant Cloudinary, API Adresse, Apple MapKit, CARTO/OSM, prestataire email, Apple, le coiffeur destinataire ; OneSignal et Stripe situés côté PRO | **conforme sauf l'hébergeur** | MEDIUM | « Hébergeur de l'application et de la base » reste « À préciser » — H-5 |
| **5.1.2 — textes des permissions iOS** | Les trois textes décrivent l'usage client et tutoient, dans `Info.plist`, `sync-ios-chair.sh` **et** le workflow client de `codemagic.yaml` | **conforme** | LOW | Relire `Info.plist` après `npm run ios:chair` — M-3 |
| **5.6 — Developer Code of Conduct / qualité** | `/app/compte` vouvoie encore ; `/app/aide` affiche « CHAIR · Version 1.0 » en dur ; l'écran de confirmation de signalement vouvoie | **non conforme** | MEDIUM | Détails de qualité, pas des motifs de rejet en soi — M-4 |
| **2.5.1 / 4.0 — qualité sur iPad** | `TARGETED_DEVICE_FAMILY = "1"` | **conforme** | LOW | Aucune capture iPad ne sera exigée — M-6 clos |
| **Privacy manifest (ITMS-91053)** | `PrivacyInfo.xcprivacy` : `NSPrivacyTracking=false`, domaines vides, `UserDefaults` / `CA92.1`, rattaché à la cible | **conforme** | LOW | Vérifier au premier téléversement si Apple réclame `FileTimestamp` ou `DiskSpace` — `APP_PRIVACY_MAPPING.md` §4 |
| **ATT (5.1.2)** | Aucun SDK publicitaire, analytics ou attribution ; aucune clé de suivi | **conforme — ATT ne doit PAS être demandé** | LOW | Ne pas lier `AppTrackingTransparency` |
| **Nutrition labels (App Store Connect)** | Questionnaire à remplir | **à faire** | HIGH | Tableau prêt dans `APP_PRIVACY_MAPPING.md` §2 |
| **Déclaration de chiffrement à l'export** | `ITSAppUsesNonExemptEncryption` absente d'`Info.plist` | **à faire** | MEDIUM | Question posée à chaque téléversement — M-8 |
| **URL de support et de confidentialité** | `/confidentialite`, `/cgu`, **`/contact` et `/mentions-legales`** sont désormais exemptés du portail bêta ; **la page d'accueil `/` ne l'est toujours pas** (`frontend/proxy.ts`) | **conforme sauf l'URL marketing** | LOW | Confirmer `NEXT_PUBLIC_BETA_ENABLED=false` en production, ou exempter `/` avant de déclarer une Marketing URL — M-7 |

---

## 3. Constats détaillés

### BLOCKER

#### B-1 — Signalement de contenu — livré, non déployé
**Guideline 1.2** : « a mechanism to report offensive content ».

Livré et vérifié par lecture :
- `POST /api/reports` (authentifié, `throttle:15,60`) — `backend/app/Http/Controllers/Api/ReportController.php`.
  Six motifs (`inappropriate`, `harassment`, `spam`, `misleading`, `intellectual_property`,
  `other`), types `post | review | profile | user`, `profile` normalisé en `user` côté serveur,
  `reported_user_id` résolu par le serveur, doublon renvoyé en 409 traité comme un succès côté UI.
- `frontend/components/ui/ReportSheet.tsx` — exporte `ReportSheet` (la feuille) et `ContentMenu`
  (le déclencheur `⋯`). Anti double-tap présent (`if (!reason || sending) return`).
- Points de pose vérifiés : `app/app/coiffeur/[slug]/page.tsx:111`, `app/app/feed/page.tsx:275`,
  `app/app/realisation/[id]/page.tsx:136`, et `components/ui/PublicProfileReviews.tsx:115` pour
  les avis (bouton « Signaler un avis » + sélecteur, sans blocage à cet endroit).
- Règles publiées : `frontend/app/app/regles-communaute/page.tsx`.

**Reste :** tester le parcours sur appareil, vérifier que la file `/admin/signalements` reçoit,
et **déployer**.

#### B-2 — Blocage d'un compte — livré, portée désormais large mais incomplète
**Guideline 1.2** : « the ability to block abusive users from the service ».

Livré : `UserBlockController` (`POST`/`DELETE /users/{id}/block`, `GET /my-blocks`), modèle
`UserBlock`, migration `2026_08_24_100000_create_user_blocks_table.php`, `BlockConfirmSheet.tsx`,
liste débloquable en section 9 de `/app/regles-communaute`.

**Portée réelle, re-vérifiée en fin de session.** `UserBlock::blockedIdsFor()` est appelé dans
cinq endroits du backend :

| Fichier | Ligne | Effet |
|---|---|---|
| `HairdresserController.php` | 380 | fil de réalisations (tous les tris) |
| `SearchController.php` | 80 et 204 | résultats de recherche |
| `ExploreController.php` | 77 | exploration |
| `RecommendationController.php` | 57 | recommandations |

C'est un net progrès sur le constat initial (le fil seul). **Ce qui n'est toujours pas filtré,
vérifié :** `HairdresserController::index` (liste des coiffeurs, ligne 80 — aucun appel),
`HairdresserController::show` (fiche publique `/app/coiffeur/[slug]`, ligne 291), et les
classements. Un reviewer qui bloque un compte puis rouvre sa fiche publique le retrouve intact.

La feuille de confirmation reste honnête : elle promet « tu ne verras plus les publications de X
dans ton fil », pas la disparition du compte. **Reste à décider :** étendre le filtrage à la fiche
publique et aux classements, ou assumer la portée actuelle et la décrire telle quelle dans les
notes de review (c'est ce que fait la rédaction actuelle de `APPLE_REVIEW_NOTES.md`). C'est un
développement, hors du périmètre documentaire.

#### B-3 — Aucun filtrage des contenus avant publication — ouvert
**Guideline 1.2** : « a method for filtering objectionable material from being posted to the app ».

Vérifié au moment de cette révision : le dépôt d'avis ne valide que le format —
`VisitController.php:216` (`required|string|min:10|max:1000`), `AppointmentController.php:577` et
`:644` (`nullable|string|max:1000`). Un grep sur `badwords|blacklist|profanity|ContentFilter` dans
`backend/app/` ne renvoie aucun service de filtrage. La modération reste postérieure et manuelle,
via le back-office — désormais alimenté par les signalements, ce qui est très différent d'avant,
mais ne couvre pas le mot « filtering ».

**Correction attendue :** au minimum un filtre lexical serveur au dépôt (avis client **et** réponse
du professionnel), refusant ou mettant en file d'attente. Les interdits sont déjà écrits noir sur
blanc en section 2 de `/app/regles-communaute` : c'est la spécification du filtre.

#### B-4 — Aucun email ne part en production — ouvert, action gérant
**Guideline 2.1.** Constat détaillé et prouvé dans `ACCOUNT_AUDIT.md` §7 : `MailService`
interrompt proprement l'envoi quand le mailer n'est pas configuré, et `POST /forgot-password`
répond quand même 200. Un reviewer qui teste « mot de passe oublié » — geste courant — voit
« email envoyé » et ne reçoit rien. Même effet sur l'email de bienvenue.

Le `.env` **local** est aujourd'hui en `MAIL_MAILER=log` avec `MAIL_HOST=mailhog` ; la
configuration de **production** n'est pas vérifiable depuis ce poste. Tant qu'elle n'est pas
prouvée, ce point reste bloquant. Variables exactes et procédure : `ACTION_GERANT.md` entrée 2.

#### B-5 — L'éditeur n'est pas identifié — ouvert, action gérant
**Guideline 5.1.1(i)** et **RGPD art. 13**. Voir H-5 pour le détail.

#### B-6 — Rien n'est déployé
`git status` au moment de cette révision : 50 fichiers modifiés, 18 non suivis, **zéro commit**.
L'app iOS charge la production. Aucun des correctifs ci-dessus n'existe pour App Review tant que
le déploiement n'a pas eu lieu. Ce n'est pas un constat de conformité, c'est le préalable à tous
les autres.

### HIGH

#### H-1 — Chemin depuis l'app client vers un abonnement payant — atténué, à confirmer sur appareil
**Guidelines 3.1.1 et 3.1.1(a).**

Ce qui a changé : les cinq liens de l'app client vers l'espace PRO portent désormais
`target="_blank" rel="noopener noreferrer"` — vérifié dans `app/app/compte/page.tsx` (lignes 118,
189, 200, 403) et `components/ui/ProfileActions.tsx:170`. `PAYMENTS_AUDIT.md` §2.1 démontre, sources
Capacitor à l'appui (`WebViewDelegationHandler.swift:328-333`), que Next saute son routeur client
dès qu'un `target` est présent, que WebKit demande alors une nouvelle fenêtre et que Capacitor
répond par `UIApplication.shared.open(url)` : la page s'ouvre **dans Safari**, hors du conteneur.
Le chemin in-app vers Stripe Checkout est donc fermé sur le papier.

Ce qui reste :
- **Confirmation sur appareil réel** — la démonstration est théorique tant qu'elle n'a pas été
  reproduite sur un iPhone avec le build soumis.
- La FAQ de `/app/aide` conserve la phrase « les coiffeurs peuvent […] accéder à des
  fonctionnalités avancées via un abonnement pro ». Ce n'est pas un lien, mais c'est une mention
  d'un abonnement numérique dans l'app client. Effet en review : **incertain**.
- Le libellé « Devenir coiffeur sur CHAIR » reste une incitation, même si la destination s'ouvre
  hors app. L'option la plus sûre — retirer complètement ces entrées de l'app client — reste
  disponible et n'a pas été retenue. **Décision produit, pas correctif technique.**
- `PAYMENTS_AUDIT.md` §8 H3 rappelle qu'un bouton d'abonnement visible mais non fonctionnel
  (Stripe non configuré) est un motif de rejet côté PRO. Le drapeau `chair_plus_enabled` est le
  levier.

#### H-3 — Contenu de démonstration en base — ouvert, décision gérant
**Guidelines 2.3.1 / 2.3.** `backend/app/Console/Commands/DemoReset.php` génère des profils de
coiffeurs, des salons et des avis en `@demo.getchair.app`. `next.config.ts` autorise toujours
`images.unsplash.com` et `i.pravatar.cc` en sources d'images (lignes 68-69).

**À trancher :** la base de production contient-elle ces profils ? Si oui, l'app présente à un
reviewer — et à de vrais utilisateurs — des professionnels et des avis qui n'existent pas. Ce
n'est pas seulement un risque App Store, c'est aussi un problème de droit de la consommation.

Attention : `php artisan chair:demo-reset` est **destructif** et ne doit jamais être lancé en
production.

#### H-4 — Risque « site web reconditionné » — ouvert, un levier amorcé
**Guideline 4.2.** Conteneur Capacitor `server.url` distant, aucun code embarqué, un seul plugin
natif, pas de push, pas de mode hors ligne, pas de widget, pas de partage natif.

**Nouveauté vérifiée :** le socle web des **Universal Links** a été posé pendant la session —
`frontend/app/.well-known/apple-app-site-association/route.ts` sert le JSON revendiquant les
routes `/app/*` et les anciennes routes redirigées. La route renvoie volontairement **404 tant
que la variable `APPLE_TEAM_ID` n'est pas renseignée** : un Team ID inventé serait mis en cache
plusieurs jours par le CDN d'Apple et casserait la fonction bien après correction. Le 404 est donc
l'état sain, pas un bug. Côté natif il reste la capability *Associated Domains* et un nouveau
build. Procédure complète : `DEEPLINKS_SETUP.md`.

Différences natives réelles, à mettre en avant : demande de position par le bridge natif plutôt
que la popup WKWebView (`hooks/useGeolocation.ts`), écran de lancement natif, bannière de
téléchargement et bandeau de stockage local désactivés en natif (`AppDownload.tsx:59`,
`CookieBanner.tsx:53`), page 404 qui reste dans l'app, navigation en onglets et zones sûres iOS.

C'est mince. Deux leviers, tous deux hors périmètre documentaire : ajouter au moins une capacité
réellement native (les notifications push — le serveur est prêt, il manque le SDK côté app — et/ou
les universal links pour que les QR `/app/scan/[token]` ouvrent l'app), et argumenter dans les
notes de review. **Un rejet 4.2 reste possible même avec ces ajouts.**

#### H-5 — Politique de confidentialité — réécrite, bloquée sur l'identité de l'éditeur

`frontend/app/confidentialite/page.tsx` est en version 1.1 du 24 août 2026 et a été relu ligne à
ligne pour cette révision. Sont désormais exacts : la liste des sous-traitants (Cloudinary, API
Adresse data.gouv.fr, Apple MapKit JS, CARTO/OpenStreetMap, prestataire email, Apple, le coiffeur
destinataire), le cadre de transfert (clauses contractuelles types / EU-US DPF, plus aucune mention
de Privacy Shield), l'absence d'achats intégrés, l'absence de push dans ce build, le comportement
réel de la géolocalisation, ce que fait réellement la suppression de compte, et une section
explicite « aucun IDFA, aucun suivi inter-apps, pas de demande ATT ».

**Ce qui bloque :** la constante `CONTROLLER` en tête de fichier a ses cinq champs à `null`
(`legalName`, `legalForm`, `address`, `registration`, `dpo`). Le rendu retombe donc sur « CHAIR »
plus une adresse email : ce n'est pas une identification du responsable du traitement. Le fichier
attend les valeurs — **le blocage est humain, pas technique.** Voir `ACTION_GERANT.md` entrée 1.

Reste également : l'hébergeur est encore « À préciser — voir mentions légales » dans le tableau
des destinataires, et l'adresse de contact est `hello@getchair.app` ici contre
`contact@getchair.app` ailleurs (M-5).

### MEDIUM

#### M-1 — Demande de position — corrigée
`components/ui/GeoPermissionModal.tsx` vérifié : `GEO_RELEVANT_PATH = '/app/recherche'`, sortie
immédiate si `pathname !== GEO_RELEVANT_PATH`, écran d'explication après 1,8 s uniquement si la
permission n'a jamais été demandée ni accordée ni refusée, et alerte système déclenchée seulement
par le tap sur « Autoriser ». Comportement conforme à ce qu'annonce `/confidentialite` §4.

Inchangé et favorable : l'app reste pleinement utilisable si la permission est refusée. C'est le
point déterminant pour 5.1.1, et il est énoncé dans les notes de review.

**Reste :** re-tester sur appareil réel après build.

#### M-2 — Suppression de compte — corrigée
`AuthController::deleteAccount` (lignes 312-373) vérifié : transaction, suppression des avis,
rendez-vous et notifications, détachement des abonnements **avec recalcul de `followers_count`**,
détachement des profils enregistrés, purge de `saved_posts`, `post_likes`, `push_subscriptions`,
`notification_preferences`, `user_preferences`, `share_events`, `support_requests`, `stories`,
anonymisation de `profile_views.viewer_user_id`, `scrubHairdresserProfile()` (dépublication des
posts, `is_hidden` sur le profil pro), révocation des jetons, anonymisation de la ligne `users`.

Les textes sont alignés : `/app/compte/supprimer` dit « Tout se passe immédiatement, dès que tu
confirmes » et `cgu/page.tsx:172` dit « La suppression est immédiate et irréversible ». La mention
« 30 jours » a disparu des deux.

**Reste un arbitrage humain :** supprimer les avis d'un client efface l'historique de notation des
professionnels concernés, et `avg_rating` n'est pas recalculée dans cette méthode. Une
anonymisation de l'avis serait plus juste pour les pros. Décision gérant.

#### M-3 — Textes de permission iOS — corrigés partout
Les trois textes d'`Info.plist` décrivent l'usage client (photo de profil, coiffeurs proches) et
tutoient. Les deux fichiers qui les réécrivaient sont maintenant alignés :
`frontend/scripts/sync-ios-chair.sh` et le workflow `chair-client-ios` de `codemagic.yaml`
(lignes 42-43, 96-97, 99-100). Le workflow PRO conserve ses propres textes PRO, ce qui est correct.

**Reste :** relire `Info.plist` après `npm run ios:chair`, par principe.

#### M-4 — Cohérence rédactionnelle — ouvert
Vérifié : `app/app/compte/page.tsx:92-93` vouvoie (« Connectez-vous à CHAIR », « Accédez à votre
profil, vos inspirations et vos réservations »), ligne 116 « Vous êtes coiffeur ? » ;
`app/app/aide/page.tsx` affiche « CHAIR · Version 1.0 » en dur, qui divergera du numéro réel ;
`components/ui/ReportSheet.tsx:118` affiche « Merci, **votre** signalement a été transmis » alors
que le reste de la feuille tutoie. Ce ne sont pas des motifs de rejet en soi, mais 5.6 et
l'appréciation générale de qualité se jouent là.

#### M-5 — Adresses de contact — largement unifiées, deux exceptions
`frontend/lib/contact.ts` a été créé pendant la session : il exporte `SUPPORT_EMAIL`
(`contact@getchair.app`), `SUPPORT_MAILTO`, `SUPPORT_HOURS`, `SUPPORT_RESPONSE_DELAY` et
`MODERATION_DELAY`, avec l'argument explicite qu'une adresse ou un délai différent selon la page
est un motif de rejet (1.2 et 2.3). Le fichier justifie le choix : `ContactController` envoie déjà
le formulaire de contact à `contact@getchair.app`.

Importent ces constantes, vérifié : `app/app/aide/page.tsx`, `app/app/regles-communaute/page.tsx`,
`app/contact/page.tsx`, `app/mentions-legales/page.tsx`, `components/landing/LandingFooter.tsx`,
`components/layout/AppShell.tsx`.

**Restent en dur :** `hello@getchair.app` dans `frontend/app/confidentialite/page.tsx`
(constante locale `CONTACT_EMAIL`, 6 occurrences rendues) et dans
`components/ui/ReportSheet.tsx:144` ; `MAIL_FROM_ADDRESS=bonjour@getchair.app` côté serveur.
À aligner sur `lib/contact.ts`, et surtout : **confirmer que l'adresse retenue est réellement
relevée par un humain** — c'est ce qu'exige la guideline 1.2, pas la simple cohérence.

`lib/contact.ts` expose aussi `SOCIAL_LINKS` (Instagram, TikTok) à `null` : les liens morts vers
`instagram.com` et `tiktok.com` sans handle ont été retirés, le bloc n'est pas rendu tant que les
comptes ne sont pas fournis. Voir `ACTION_GERANT.md`.

#### M-6 — Cible iPad — corrigée
`TARGETED_DEVICE_FAMILY = "1"` sur les deux configurations de build. Aucune capture iPad ne sera
exigée et la review se fera sur iPhone. La clé `UISupportedInterfaceOrientations~ipad` reste dans
`Info.plist` : sans effet avec la famille `"1"`, à nettoyer un jour par propreté.

#### M-7 — Portail bêta et URL publiques — corrigé sauf la page d'accueil
`frontend/proxy.ts` re-vérifié en fin de session : la liste d'exemptions couvre désormais `/app`,
`/pro`, `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe`,
`/cgu`, `/confidentialite`, **`/mentions-legales`** (ligne 53) et **`/contact`** (ligne 54), plus
les images et les manifests.

**Reste :** la page d'accueil `/` n'est toujours pas exemptée. Si `NEXT_PUBLIC_BETA_ENABLED` vaut
`true` en production, l'URL marketing déclarée dans App Store Connect tombera sur un mot de passe.
Confirmer que la variable vaut `false` en production, ou ne pas déclarer de Marketing URL (le champ
est facultatif).

#### M-8 — Déclaration de chiffrement à l'export — ouvert
`ITSAppUsesNonExemptEncryption` n'est pas déclarée dans `Info.plist`. Sans elle, Xcode et App Store
Connect posent la question à chaque téléversement et le build reste en attente de réponse. CHAIR
n'utilise que HTTPS/TLS standard, cas d'exemption habituel — mais **la déclaration est une
déclaration légale d'export : elle relève du gérant**, pas d'un agent. Voir `ACTION_GERANT.md`
entrée 7.

#### M-9 — Sorties de l'app vers le site vitrine — largement fermé
Re-vérifié en fin de session : le header **mobile** de `TopNav.tsx` (ligne 31, bloc `md:hidden`,
le seul rendu sur iPhone) pointe désormais `<ChairLogo href="/app" />`. Seul le header desktop
(ligne 47, `hidden md:flex`) pointe encore `/` — hors de portée sur l'appareil cible. Le pied de
page de `AppShell` est lui aussi `hidden md:block`.

**Restent trois liens vers `/`** sur des écrans de bout de parcours :
`app/app/scan/[token]/page.tsx` lignes 102 et 383, `app/app/avis/[token]/page.tsx:43` — deux
écrans qu'un reviewer n'atteint qu'avec un QR code ou un lien d'invitation, donc peu probables.

`/download` reste sans garde natif et affiche « CHAIR est une application mobile — Téléchargez-la
pour continuer », mais les boutons de store disparaissent (`AppDownload` retourne `null` en natif,
ligne 59) et la page n'est plus atteignable en un tap depuis l'espace client. Le pire —
« L'application est en cours de déploiement » à l'intérieur de l'app — est neutralisé.

### LOW

- **L-1 — Pas de vérification d'email à l'inscription.** `email_verified_at` existe mais n'est
  jamais exigé. Aucun blocage Apple. Effet secondaire utile : le reviewer peut créer un compte
  sans accéder à une boîte mail — ce qui, tant que le SMTP n'est pas configuré (B-4), est
  aujourd'hui la seule façon de s'inscrire.
- **L-2 — Liens sortants contrôlés par des tiers.** Les profils affichent des URL Instagram et
  TikTok saisies par les professionnels. Alimente le questionnaire d'âge et le besoin de
  signalement.
- **L-3 — QR codes et liens profonds.** Le socle web des Universal Links existe désormais, mais
  reste inactif tant que `APPLE_TEAM_ID` n'est pas posée et que la capability *Associated Domains*
  n'est pas ajoutée au projet iOS. En l'état, un QR pointant `/app/scan/[token]` ouvre Safari et
  non l'app. Le parcours reste fonctionnel ; la promesse « avis certifiés par QR » perd sa
  fluidité et le reviewer testera cette fonction dans le navigateur. Voir `DEEPLINKS_SETUP.md`.
- **L-4 — Numéro de build.** `CURRENT_PROJECT_VERSION = 1` dans le dépôt ; `sync-ios-chair.sh`
  l'incrémente via `agvtool` à chaque exécution. Vérifier avant archivage qu'il est supérieur à
  tout build déjà téléversé.
- **L-5 — Sources d'images de démonstration.** `next.config.ts:68-69` autorise encore
  `images.unsplash.com` et `i.pravatar.cc`. Inoffensif si la production ne les sert plus ; à
  retirer en même temps que la décision H-3.
- **L-6 — Note de bas de page des préférences de notification.** L'écran indique « Les
  notifications push sont gérées par ton appareil » alors qu'aucun push natif n'existe dans ce
  build. `/confidentialite` §12 dit l'inverse, plus clairement. À harmoniser.

---

## 4. Synthèse

| Risque | Constat | État vérifié au 24/08/2026 (fin de session) |
|---|---|---|
| BLOCKER | B-1 signalement de contenu | **Livré** — à tester sur appareil et à déployer |
| HIGH | B-2 blocage d'un compte | **Livré** — fil, recherche, exploration, recommandations filtrés ; fiche publique et classements non |
| BLOCKER | B-3 filtrage avant publication | **Ouvert** — aucun filtre lexical, développement à faire |
| BLOCKER | B-4 aucun email envoyé en production | **Ouvert** — action gérant (SMTP) |
| BLOCKER | B-5 éditeur non identifié | **Ouvert** — action gérant (identité juridique) |
| BLOCKER | B-6 rien n'est commité ni déployé | **Ouvert** — préalable à tout le reste |
| HIGH | H-1 chemin vers l'abonnement PRO | **Atténué** (`target="_blank"`) — à confirmer sur appareil |
| HIGH | H-3 contenu de démonstration en production | **Ouvert** — décision gérant |
| HIGH | H-4 risque « site web reconditionné » | **Ouvert** — aucune capacité native ajoutée |
| HIGH | H-5 politique de confidentialité | **Réécrite**, bloquée sur B-5 |
| MEDIUM | M-1 demande de position | **Corrigée** |
| MEDIUM | M-2 suppression de compte | **Corrigée** ; arbitrage sur le sort des avis |
| MEDIUM | M-3 textes de permission iOS | **Corrigés partout** |
| MEDIUM | M-5 adresses de contact | **Unifiées** via `lib/contact.ts` ; reste `/confidentialite` et `ReportSheet` |
| MEDIUM | M-6 cible iPad | **Corrigée** (iPhone seul) |
| MEDIUM | M-7 portail bêta | **Corrigé** sauf la page d'accueil `/` |
| LOW | M-9 sorties vers la vitrine | **Largement fermé** — 3 liens résiduels sur des écrans de bout de parcours |
| MEDIUM | M-4, M-8 | Ouverts |
| LOW | L-1 à L-6 | Ouverts |

**Sur le chemin critique d'une soumission :** B-3 (filtrage), B-4 (SMTP), B-5 (identité de
l'éditeur), B-6 (déploiement), H-3 (contenu de production), et le compte de review. Les décisions
qui ne dépendent que d'un humain sont regroupées dans `ACTION_GERANT.md`.

**Les documents de ce dossier sont documentaires.** Les corrections constatées proviennent
d'intervenants travaillant en parallèle sur le même dépôt ; elles ne sont ni commitées ni
déployées.
