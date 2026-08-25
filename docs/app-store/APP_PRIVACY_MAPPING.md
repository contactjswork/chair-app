# CHAIR CLIENT — App Privacy (App Store Connect) : correspondance code → questionnaire

**Périmètre : l'app `app.getchair.client` uniquement** (bundle CHAIR CLIENT, WebView sur
`https://www.getchair.app/app`). CHAIR PRO (`app.getchair.pro`, routes `/pro/*`) est une
soumission distincte avec sa propre déclaration : tout ce qui est propre au pro
(Stripe, portfolio, SIRET, statistiques détaillées) est **hors** de ce document.

Établi le 24 août 2026 par lecture du code (migrations, contrôleurs, composants), pas d'une
checklist. Chaque ligne renvoie au fichier qui la justifie. Toute incertitude est marquée
**À TRANCHER** plutôt que devinée.

> **Passe finale — 24 août 2026, vague 3.** Confronté une dernière fois au code du jour :
> filtre lexical au dépôt (`ContentFilter`), blocage étendu à la liste principale des coiffeurs
> (`HairdresserController::index`), annulation de rendez-vous côté client, contact unifié
> (`confidentialite` importe désormais `SUPPORT_EMAIL`, `ReportSheet` affiche
> `contact@getchair.app`), privacy manifest créé **et rattaché à la cible Xcode**.
> **Aucune réponse au questionnaire n'a changé** : les nouvelles fonctions écrivent dans des
> tables déjà déclarées (`reports`, `user_blocks`, `appointments`), et le filtre au dépôt ne
> **collecte** rien — un texte refusé répond 422 et n'est jamais stocké
> (`ContentFilter::check` est appelé avant toute écriture : `VisitController:223`,
> `AppointmentController:584,658`, `PostController` ×4). La conclusion ATT (§3) a été
> re-vérifiée par grep : toujours aucun SDK de suivi.

---

## 1. Inventaire réel des collectes

### 1.1 À la création du compte client

Source : `backend/app/Http/Controllers/Api/AuthController.php::register` (validation lignes
26-62) et `frontend/app/inscription/page.tsx` (étapes `name → city → email → phone → password`).

| Champ | Exigé ? | Stockage | Finalité | Base légale RGPD |
|---|---|---|---|---|
| `name` | Oui | `users.name` | Identification, signature des avis | Exécution du contrat |
| `email` | Oui (unique) | `users.email` | Connexion, emails transactionnels, support | Exécution du contrat |
| `password` | Oui (≥ 8) | `users.password`, haché bcrypt | Authentification | Exécution du contrat |
| `city` | Exigé par le formulaire (≥ 2 car.), `nullable` côté API | `users.city` | Filtrage géographique de la home | Exécution du contrat |
| `latitude` / `longitude` | Non saisis : dérivés de la ville | `users.latitude/longitude` | Tri par proximité | Exécution du contrat |
| `phone` | Non (étape « passer ») | `users.phone` | Contact au sujet d'une réservation | Consentement |
| `postal_code` | Non (parcours pro) | `users.postal_code` | — | — |
| `ref` | Non (code parrain capté en localStorage) | `users.referral_code`, `users.referred_by_user_id` | Programme de parrainage | Intérêt légitime |

Note importante : les coordonnées enregistrées à l'inscription **ne viennent pas du GPS**.
`AuthController::register` appelle `GeocodingService::geocode($city)` — c'est le centroïde de
la commune saisie. Localisation **grossière**, pas précise.

### 1.2 À l'usage

| Donnée | Où | Liée à l'identité | Finalité | Base légale |
|---|---|---|---|---|
| Position GPS | `users.latitude/longitude` via `PUT /user/location` ; cache local `chair_user_location` 24 h | Oui si connecté ; sinon appareil seul | Tri « les plus proches », recentrage carte | Consentement |
| Photo de profil | `users.avatar` (URL Cloudinary) | Oui | Affichage du compte et des avis | Consentement |
| Réservations | `appointments` : `client_name`, `client_email`, `client_phone`, `service`, `desired_date`, `desired_slot`, `message` | Oui | Transmettre la demande au coiffeur | Exécution du contrat |
| Avis | `reviews` : `rating`, `comment`, `specialty`, `is_verified` | Oui (publics) | Publication sur le profil du coiffeur | Exécution du contrat |
| Visite vérifiée QR | `verified_visits.client_user_id`, `scanned_at`, `service_type` | Oui | Certification des avis | Exécution du contrat |
| Favoris / abonnements | `saved_profiles`, `follows` | Oui | Retrouver les coiffeurs, fil personnalisé | Exécution du contrat |
| Likes / enregistrements | `post_likes`, `saved_posts` | Oui | Retrouver les réalisations | Exécution du contrat |
| **Profils consultés** | `profile_views` : `hairdresser_profile_id`, `viewer_user_id` (nullable), `created_at` — écrit dans `HairdresserController::show` ligne 306 | **Oui quand connecté** | Signal de recommandation + compteur d'audience agrégé du pro | Intérêt légitime |
| Stories vues | `story_views` (unique `story_id`+`user_id`) | Oui | Ne pas remontrer une story vue ; compteur | Intérêt légitime |
| Partages | `share_events` : `action_type`, `target_type`, `target_id`, `channel` | Oui | Parrainage, badges | Intérêt légitime |
| Préférences de style | `user_preferences` : `profile_type`, `interests`, `goal` + copie locale `chair_preferences` | Oui | Personnalisation des suggestions | Consentement |
| Préférences de notifications | `notification_preferences` (10 booléens) | Oui | Respect des choix d'envoi | Exécution du contrat |
| Messages support | `support_requests` : `subject`, `message` | Oui | Traitement de la demande | Exécution du contrat |
| Signalements | `reports` : `reporter_id`, `reported_user_id`, `type`, `reason`, `details` — écrit par `ReportController::store` | Oui | Modération (guideline Apple 1.2) | Intérêt légitime / obligation légale |
| **Blocages** | `user_blocks` : `blocker_id`, `blocked_id` — écrit par `UserBlockController::store`, lu par `UserBlock::blockedIdsFor()` dans `HairdresserController:96` (liste) et `:394` (fil), `SearchController:80,204`, `ExploreController:77`, `RecommendationController:57` | Oui | Retirer de l'expérience du bloqueur le contenu d'un compte bloqué (guideline 1.2) | Intérêt légitime |
| **Annulation de rendez-vous** | `appointments.status` passé à `cancelled` par `AppointmentController::clientCancel` | Oui | Gestion du rendez-vous | Exécution du contrat |
| Notifications reçues | `notifications` : `title`, `message`, `data` | Oui | Centre de notifications in-app | Exécution du contrat |
| Journaux serveur | logs Laravel (dont IP) | Indirectement | Sécurité, diagnostic | Intérêt légitime |

**Points vérifiés et négatifs — à faire valoir en review :**

- `verified_visits.client_token` est documenté « fingerprint anonyme si pas inscrit », mais
  **la colonne n'est jamais renseignée** : `QrTokenService.php` ligne 89 écrit `null` en dur.
  Aucun fingerprinting n'est implémenté.
- `profile_views` n'enregistre `viewer_user_id` **que** pour un visiteur connecté (commentaire
  explicite dans la migration `2026_08_17_100000`). Aucun identifiant anonyme n'est fabriqué.
- Les statistiques rendues au professionnel (`AnalyticsController` lignes 330+) sont des
  `COUNT(*)` groupés par date. **Un coiffeur ne voit jamais qui l'a consulté.**
- Les recherches récentes (`chair_recent_searches_v2`, `lib/explore.ts`) ne quittent jamais
  l'appareil. Aucune table de journalisation des recherches n'existe côté serveur.
- Aucun paiement dans l'app client : pas de Stripe, pas d'achat intégré. La prestation se
  règle au salon (cohérent avec la guideline 3.1.3(e), et pas de sujet 3.1.1).
- Le filtre lexical au dépôt (`backend/app/Services/ContentFilter.php`) **ne crée aucune
  collecte** : un avis ou une description refusés répondent 422 avant toute écriture en base.
  Rien à déclarer de nouveau dans le questionnaire.

### 1.3 Stockage local déposé par l'app (audit exhaustif)

`localStorage`, tout en première partie, aucun cookie tiers :

| Clé | Fichier | Contenu |
|---|---|---|
| `chair_token`, `chair_user` | `lib/auth.ts` | Jeton Sanctum + profil en cache |
| `chair_user_location`, `chair_geo_asked` | `hooks/useGeolocation.ts` | Position (TTL 24 h), drapeau « déjà proposé » |
| `chair_preferences` | `app/app/onboarding/page.tsx` | Genre + centres d'intérêt |
| `chair_notif_prefs` | `app/app/notifications/preferences/page.tsx` | Copie locale des préférences |
| `chair_recent_searches_v2` | `lib/explore.ts` | Recherches récentes (appareil seul) |
| `chair_booking_intent` | `lib/bookingIntent.ts` | Réservation en cours avant connexion |
| `chair_ref` | `lib/referral.ts` | Code parrain capté sur `?ref=` |
| `chair_client_onboarding_seen` | `app/app/layout.tsx` | Carrousel déjà vu |
| `chair_seen_badges` | `hooks/useNewlyUnlockedBadges.ts` | Badges déjà annoncés |
| `chair_app_banner_dismissed` | `components/ui/AppBanner.tsx` | Bandeau « installer l'app » fermé |
| `chair_cookies_consent` | `components/ui/CookieBanner.tsx` | Information sur le stockage lue |
| `chair_mapkit_token` | `components/search/mapkitAdapter.ts` | Jeton MapKit JS de courte durée |
| `chair_review_dismissed_{id}` | `components/ui/ReviewPromptTrigger.tsx` | Invitation à noter refusée |

Re-vérifié en fin de session par grep sur `chair_` dans `lib/` et `hooks/` : les clés écrites côté
client sont bien celles-ci. Aucune clé nouvelle n'a été introduite par le signalement, le blocage
ou l'annulation de rendez-vous — ces trois fonctions écrivent uniquement côté serveur.

`sessionStorage` : `chair_redirect`, `chair_session_expired` (navigation).
Cookie : aucun côté client. Seul `chair_beta` est lu par `app/beta/page.tsx`, jamais écrit
par l'app.

### 1.4 Tiers réellement contactés

| Tiers | Déclenché par | Reçoit | Fichier |
|---|---|---|---|
| Cloudinary | Upload d'avatar | Le fichier image | `backend/app/Services/CloudinaryService.php` |
| API Adresse (data.gouv.fr, France) | Autocomplétion ville, reverse géocodage | La ville saisie **ou les coordonnées GPS exactes** | `backend/app/Services/GeocodingService.php` (`API_BASE`, `reverse()` ligne 119) |
| Apple MapKit JS | Ouverture d'une carte | IP, zone affichée | `components/search/mapkitAdapter.ts`, préconnexion dans `app/layout.tsx` |
| CARTO / OpenStreetMap | Repli si MapKit indisponible | IP, tuiles demandées | `components/search/leafletAdapter.ts` ligne 54 |
| Prestataire email | Emails transactionnels | Email, contenu du message | `backend/app/Services/MailService.php` — **À TRANCHER : quel prestataire SMTP en production ?** |
| Hébergeur | Tout | Tout | **À FOURNIR** |
| Apple | Distribution | — | App Store |

Non actifs dans le build client, vérifiés : **OneSignal** (aucune occurrence dans
`frontend/`, aucun entitlement `aps-environment`, `packageClassList` limité à
`GeolocationPlugin`) et **Stripe** (aucune occurrence dans `app/app/`).

---

## 2. Réponses au questionnaire App Privacy

Convention : **Collected** = transmis hors de l'appareil et conservé ·
**Linked** = rattachable à l'identité · **Tracking** = au sens Apple (rapprochement avec des
données d'autres sociétés à des fins publicitaires ou de courtage).

### Contact Info

| Type | Collected | Linked | Tracking | Purposes |
|---|---|---|---|---|
| Name | **Oui** | Oui | Non | App Functionality |
| Email Address | **Oui** | Oui | Non | App Functionality *(voir À TRANCHER n° 3)* |
| Phone Number | **Oui** (facultatif) | Oui | Non | App Functionality |
| Physical Address | Non | — | — | — |
| Other User Contact Info | Non | — | — | — |

### Health & Fitness · Financial Info · Contacts · Sensitive Info

**Non collecté**, aucune sous-catégorie. Pas de paiement dans l'app client, pas d'accès au
carnet d'adresses, aucune donnée sensible au sens de l'article 9 du RGPD.

### Location

| Type | Collected | Linked | Tracking | Purposes |
|---|---|---|---|---|
| Precise Location | **Oui** (sur autorisation) | Oui si connecté | Non | App Functionality, Product Personalization |
| Coarse Location | **Oui** (ville + centroïde) | Oui | Non | App Functionality |

### User Content

| Type | Collected | Linked | Tracking | Purposes |
|---|---|---|---|---|
| Photos or Videos | **Oui** (photo de profil) | Oui | Non | App Functionality |
| Customer Support | **Oui** (`support_requests`) | Oui | Non | App Functionality |
| Other User Content | **Oui** (avis, message de réservation, signalements) | Oui | Non | App Functionality |
| Emails or Text Messages | Non | — | — | — |
| Audio Data | Non | — | — | — |
| Gameplay Content | Non | — | — | — |

### Browsing History

**Non.** Apple définit cette catégorie comme l'historique de contenus **extérieurs à l'app**.
Les profils consultés dans CHAIR relèvent de *Usage Data › Product Interaction*.

### Search History

**Non.** Les recherches récentes restent sur l'appareil (`chair_recent_searches_v2`) et aucune
table serveur ne les conserve. Les requêtes envoyées à `/explore` sont traitées puis oubliées.

### Identifiers

| Type | Collected | Linked | Tracking | Purposes |
|---|---|---|---|---|
| User ID | **Oui** (`users.id`, jeton Sanctum, `referral_code`) | Oui | Non | App Functionality |
| Device ID | **Non dans ce build** | — | — | — |

`push_subscriptions.token` existe en base mais **aucun SDK push n'est intégré au build
client** : à repasser à « Oui / Linked / App Functionality » le jour où les notifications
push sont activées.

### Purchases

**Non.** Aucun achat intégré, aucun paiement. Les prestations se règlent au salon.

### Usage Data

| Type | Collected | Linked | Tracking | Purposes |
|---|---|---|---|---|
| Product Interaction | **Oui** (`profile_views`, `story_views`, `post_likes`, `saved_posts`, `follows`, `share_events`) | Oui | Non | App Functionality, Product Personalization |
| Advertising Data | Non | — | — | — |
| Other Usage Data | Non | — | — | — |

### Diagnostics

**Non.** Aucun SDK de crash ou de performance dans l'app (`package.json` : pas de Sentry,
Firebase, Crashlytics, Bugsnag). Les journaux Laravel sont côté serveur, pas une collecte
faite par l'app. Le rapport de crash proposé par iOS lui-même n'est pas une collecte
développeur au sens du questionnaire.

### Other Data

**Non**, sauf à considérer les préférences de style (`user_preferences`) comme telles ; elles
sont mieux déclarées en *Usage Data › Product Interaction* (Product Personalization).

---

## 3. Tracking et ATT — conclusion

**ATT ne doit PAS être demandé. Il ne faut PAS lier `AppTrackingTransparency`, ni appeler
`requestTrackingAuthorization`, ni ajouter `NSUserTrackingUsageDescription`.**

Recherche exhaustive menée sur `frontend/` (hors `node_modules`) et sur le projet iOS —
**refaite lors de la passe finale du 24 août 2026 (vague 3)**, avec le même résultat : la seule
occurrence textuelle est une phrase de la politique de confidentialité expliquant que OneSignal
et Stripe concernent CHAIR PRO et **ne sont pas activés** dans l'app cliente
(`app/confidentialite/page.tsx:234`). Aucun SDK n'est apparu :

- `package.json` : 7 dépendances runtime — `@capacitor/geolocation`, `leaflet`,
  `@types/leaflet`, `lucide-react`, `next`, `qrcode.react`, `react`, `react-dom`,
  `react-easy-crop`. **Aucun SDK publicitaire, analytics, attribution ou MMP.**
- Grep sur `gtag|googletagmanager|google-analytics|facebook|fbq|segment|mixpanel|amplitude|posthog|sentry|firebase|appsflyer|adjust|branch.io|idfa|AppTrackingTransparency` :
  **zéro occurrence** dans le code applicatif.
- Aucun script tiers chargé : `app/layout.tsx` ne contient qu'une préconnexion DNS/TLS vers
  `cdn.apple-mapkit.com`. Les polices Geist sont servies par `next/font` (auto-hébergées).
- `ios/App/App/Info.plist` : aucune clé de suivi. `capacitor.config.json` :
  `packageClassList` = `["GeolocationPlugin"]` uniquement.
- Aucun identifiant publicitaire n'est lu ni transmis ; aucune donnée n'est partagée avec un
  courtier de données ; aucune donnée n'est rapprochée de données tierces.

Le seul mécanisme qui **ressemble** à de l'attribution est le parrainage (`chair_ref` →
`users.referred_by_user_id`, `share_events`) : il est **entièrement première partie et
interne à CHAIR** — un code appartenant à un utilisateur CHAIR, stocké sur l'appareil,
envoyé à l'API CHAIR au moment de l'inscription. Cela ne constitue pas du *tracking* au sens
d'Apple.

Conséquence pour App Store Connect : répondre **« No »** à la question « Do you or your
third-party partners use data for tracking purposes? », et cocher **Tracking = Non** sur
chaque type de données. Demander l'autorisation ATT sans motif est en soi un motif de rejet.

---

## 4. Privacy manifest (`PrivacyInfo.xcprivacy`) — état et manques

Exigence en vigueur : depuis le 1er mai 2024, tout binaire téléversé sur App Store Connect
doit déclarer les *Required Reason APIs* qu'il utilise dans un privacy manifest, et les SDK
tiers figurant sur la liste Apple des « commonly used SDKs » doivent embarquer le leur, signé.
Les manquements reviennent par email automatisé (**ITMS-91053** « Missing API declaration »,
**ITMS-91061** « Missing privacy manifest ») — c'est aujourd'hui la cause de rejet
automatisée la plus fréquente sur un projet Capacitor.

### État constaté — re-vérifié le 24 août 2026 en fin de session

| Élément | Manifest | Constat |
|---|---|---|
| Cible `App` (`frontend/ios/App/App/`) | **PRÉSENT** | `PrivacyInfo.xcprivacy` créé pendant la session, **et rattaché à la cible** : `project.pbxproj` le référence quatre fois, dont une en `PBXBuildFile … in Resources` (ligne 16) et une dans la phase `Resources` (ligne 148) |
| Capacitor core | Fourni par le paquet SPM distant | `capacitor-swift-pm` résolu en `exact: "8.4.1"` depuis GitHub (`frontend/ios/App/CapApp-SPM/Package.swift`) — le manifest embarqué est celui de ce paquet, non vérifiable depuis ce poste |
| `@capacitor/geolocation` 8.2.0 | **ABSENT** | Aucun `.xcprivacy` dans le paquet ; il est référencé en `path:` vers `node_modules` |

Contenu du manifest, vérifié :

- `NSPrivacyTracking` = `false` — aucun SDK publicitaire, analytics, attribution ou fingerprinting
  n'est embarqué. Conséquence directe : **l'app ne doit pas demander ATT**.
- `NSPrivacyTrackingDomains` = tableau vide.
- `NSPrivacyCollectedDataTypes` = tableau vide, avec un commentaire qui l'assume : la collecte
  décrite dans App Store Connect est le fait du service web (compte, réservations, avis), pas de
  code embarqué dans le binaire. Ce tableau ne décrit que ce que **le binaire** collecte lui-même.
- `NSPrivacyAccessedAPITypes` : `NSPrivacyAccessedAPICategoryUserDefaults` avec la raison
  **`CA92.1`** — c'est l'omission de cette déclaration qui déclenche ITMS-91053 sur un projet
  Capacitor.

> Le commentaire en tête du fichier dit qu'il « doit être ajouté à la cible dans Xcode ». C'est
> **déjà fait** dans `project.pbxproj` — la consigne est périmée, elle reste un rappel utile pour
> qui régénérerait le projet iOS de zéro.

### Ce qu'il reste à vérifier

1. **Après chaque `npx cap sync ios`**, confirmer que `PrivacyInfo.xcprivacy` est toujours dans
   *Build Phases → Copy Bundle Resources* de la cible `App`. Le workflow `chair-client-ios` de
   `codemagic.yaml` régénère le projet iOS s'il est absent (`test -d ios || npx cap add ios`) —
   dans ce cas la référence serait perdue.
2. **Après le build**, vérifier que le manifest est bien dans l'`.ipa` (`unzip -l` de l'archive).
3. **Au premier téléversement**, lire l'email automatisé d'Apple : s'il mentionne
   `NSPrivacyAccessedAPICategoryFileTimestamp` (`C617.1`) ou `DiskSpace` (`E174.1`), les ajouter.
   Ne rien déclarer « au cas où » — une déclaration excessive est aussi un signal négatif.
4. Faire un premier téléversement **TestFlight avant la soumission**, précisément pour récupérer
   ces emails pendant qu'ils ne coûtent rien.

---

## 5. Bannière cookies en contexte natif — décision

**Vérifié dans le code :** l'app ne dépose aucun cookie propre, aucun traceur, aucune mesure
d'audience. Uniquement le `localStorage` première partie listé en 1.3, tout strictement
nécessaire au service.

**Décision : le bandeau ne s'affiche pas dans l'app native, et n'est plus une demande de
consentement sur le web.** `components/ui/CookieBanner.tsx` :

- `getConsentSnapshot()` retourne `!isNativeApp() && !hasStoredAcknowledgement()` — le bandeau
  est invisible dans le shell Capacitor. Un mur de consentement au premier lancement serait la
  première chose que verrait le reviewer, pour du stockage exempté de consentement.
- Les boutons « Accepter / Refuser » ont été remplacés par une information et un unique
  « J'ai compris ». Motif : le bouton « Refuser » n'avait aucun effet — le stockage
  strictement nécessaire restait déposé dans les deux cas. Proposer un choix qui n'en est pas
  un est un faux consentement ; l'exemption des traceurs strictement nécessaires (ePrivacy,
  doctrine CNIL) rend l'information suffisante.
- La clé `chair_cookies_consent` est conservée : les visiteurs web ayant déjà répondu
  (`accepted` comme `declined`) ne revoient rien.

Si un jour une mesure d'audience est ajoutée, cette décision doit être **révisée** : il
faudra alors un vrai consentement préalable, refusable aussi facilement qu'acceptable, et
révocable depuis les réglages.

---

## 6. Écarts corrigés dans la politique de confidentialité

`frontend/app/confidentialite/page.tsx` a été confronté à l'inventaire ci-dessus. Corrections :

| Écart | Avant | Après |
|---|---|---|
| Tiers manquants | Cloudinary + « hébergeur » + Apple | + API Adresse (reçoit les **coordonnées GPS** en reverse géocodage), Apple MapKit JS, CARTO/OpenStreetMap, prestataire email, le coiffeur destinataire |
| Cadre de transfert périmé | « Privacy Shield » (invalidé en 2020) | EU-US Data Privacy Framework / clauses contractuelles types |
| Historique de consultation | « Données de navigation (anonymisées) » | `profile_views` est **rattaché à l'identifiant** quand l'utilisateur est connecté ; dit explicitement, avec la précision que le pro ne voit que des compteurs agrégés |
| Traitements absents | — | Stories vues, partages, likes/enregistrements, préférences de notifications, support, signalements, visites QR |
| Suppression de compte | « suppression définitive sous 30 jours » | Décrit ce que fait réellement `AuthController::deleteAccount` : suppression immédiate des avis/RDV/notifications/favoris/abonnements, anonymisation du compte, révocation des jetons |
| Portabilité | « format lisible (JSON/CSV) » laissait croire à un export intégré | « sur demande par email » — aucun endpoint d'export n'existe |
| Notifications push | « L'application peut vous envoyer des notifications push » | Faux dans ce build : aucun SDK push, aucun entitlement. Reformulé en notifications in-app + email |
| Achats | « achats in-app » cité dans le rôle d'Apple | Retiré : l'app client ne fait aucun paiement |
| Âge | « 13 ans et plus » (contredisait les CGU) | Aligné sur les CGU : majeurs, ou mineurs avec autorisation parentale |
| Localisation | Description générique | Décrit le parcours réel : demandée sur l'écran de recherche uniquement, sur geste explicite, premier plan, cache 24 h, refus sans dégradation |
| Tracking / ATT | Absent | Section explicite « aucun IDFA, aucun suivi inter-apps, pas de demande ATT » |
| Identité de l'éditeur | « CHAIR » + un email | Structure `CONTROLLER` en tête de fichier, à compléter — voir ci-dessous |

**Re-vérifié le 24 août 2026, vague 3**, ligne à ligne : la politique est en version 1.1,
le tableau des destinataires §5 nomme bien Cloudinary, l'API Adresse, Apple MapKit JS,
CARTO/OpenStreetMap, le prestataire email, Apple et le coiffeur destinataire ; §12 dit
explicitement que cette version n'envoie **pas** de notifications push système ; §9 décrit la
suppression immédiate ; l'adresse de contact est désormais importée de `lib/contact.ts`
(`CONTACT_EMAIL = SUPPORT_EMAIL`, ligne 37). `CONTROLLER` est **toujours entièrement à `null`**.

Trois écarts subsistent dans la politique elle-même :
- l'hébergeur et le prestataire email restent « À préciser — voir mentions légales » (§5,
  lignes 218 et 223) — dépend de `ACTION_GERANT.md` entrées 1 et 2 ;
- §13 « Contenus publiés et modération » décrit le **signalement** mais ni le **blocage**
  (qui enregistre une donnée, `user_blocks`) ni le **filtre au dépôt**. À compléter d'une
  phrase chacun ;
- rien n'est déployé : la version en production le jour de la review doit être celle-ci.

---

## 7. À fournir par le gérant

**Cette liste est reprise et détaillée dans `ACTION_GERANT.md`** — l'endroit exact où poser chaque
valeur y est donné. Elle est conservée ici pour que ce document reste lisible seul.

1. **Identité du responsable de traitement** (bloquant RGPD art. 13 + Apple 5.1.1(i)) : raison
   sociale, forme juridique, adresse du siège, SIREN/SIRET ou RCS. À renseigner dans la constante
   `CONTROLLER` de `frontend/app/confidentialite/page.tsx` **et** dans `PUBLISHER` de
   `frontend/app/mentions-legales/page.tsx`. Les champs `null` ne sont pas rendus — les deux pages
   sont incomplètes tant qu'ils le restent. → `ACTION_GERANT.md` entrée 1
2. **DPO ou point de contact vie privée** désigné, s'il en existe un.
3. **Adresse de contact relevée.** Le code a tranché et l'alignement est terminé :
   `frontend/lib/contact.ts` impose `contact@getchair.app`, la politique de confidentialité
   l'importe (`CONTACT_EMAIL = SUPPORT_EMAIL`) et `ReportSheet.tsx:144` l'affiche aussi. Ce que
   le gérant doit fournir n'est plus un arbitrage mais une **confirmation que la boîte est
   réellement lue** — Apple 1.2. → `ACTION_GERANT.md` entrée 4
4. **Hébergeur** : nom, pays, localisation des serveurs et de la base. À poser dans `HOST`
   (mentions légales) et dans le tableau §5 de la politique, qui affiche encore « À préciser ».
5. **Prestataire SMTP de production** et son pays. → `ACTION_GERANT.md` entrée 2
6. **Contrats de sous-traitance** signés avec Cloudinary et le prestataire email (RGPD art. 28).
7. **URL publique de la politique** à saisir dans App Store Connect :
   `https://www.getchair.app/confidentialite`. Vérifié : la page est exemptée du portail bêta
   (`frontend/proxy.ts:52`). Tester qu'elle répond en 200 sans authentification avant la
   soumission.
8. **Notifications promotionnelles** : le type `promotion` existe côté serveur, désactivé par
   défaut. Si des messages promotionnels sont réellement envoyés, ajouter la finalité *Developer's
   Advertising or Marketing* aux entrées **Email Address** et **User ID** du questionnaire.
9. **Durée de conservation des journaux** effectivement configurée côté hébergeur (la politique
   annonce 12 mois maximum : le confirmer ou corriger).
10. **Comptes Instagram et TikTok de CHAIR**, s'ils existent. `lib/contact.ts` expose
    `SOCIAL_LINKS` à `null` : le bloc n'est pas rendu tant que rien n'est fourni, ce qui évite les
    liens morts précédents.
