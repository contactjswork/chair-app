# CHAIR CLIENT — audit des permissions iOS

Bundle `app.getchair.client`. Établi le 24 août 2026 par lecture du code, pas d'une checklist.
Guideline de référence : **5.1.1** — « Apps must request access to this data only when it is
directly relevant to the features and services provided », et le texte d'usage doit décrire
« clearly and completely » l'usage réel.

Attention à la source de vérité : `frontend/ios/App/App/Info.plist` est committé, mais le
workflow `chair-client-ios` de **`codemagic.yaml` réécrit les trois clés à chaque build**
(lignes 88-100 pour caméra/photos, ancre `configure_ios_location` pour la localisation).
Toute correction de texte doit être faite **dans `codemagic.yaml`** — sinon elle est écrasée
par la CI.

---

## Tableau de synthèse

| Permission | Déclarée | Réellement atteignable | Demandée quand | Comportement si refus | Statut |
|---|---|---|---|---|---|
| Localisation (When In Use) | Oui | Oui | Écran de recherche, sur geste explicite | App pleinement utilisable, recherche par ville | **Conforme** (corrigé, voir § 1) |
| Photothèque | Oui | Oui — photo de profil | Au tap sur la photo de profil | Aucune photo, reste facultatif | **Conforme sur le principe, texte à corriger** |
| Appareil photo | Oui | Oui — photo de profil (option « Prendre une photo » de la feuille iOS) | Idem | Idem | **Conforme sur le principe, texte à corriger** |
| Notifications push | **Non déclarée / non demandée** | Non — aucun SDK push dans le build client | Jamais | — | **Conforme** (rien à faire) |
| Suivi (ATT) | Non | Non | **Jamais — et il ne faut pas** | — | **Conforme** (voir APP_PRIVACY_MAPPING § 3) |
| Micro, contacts, calendrier, Bluetooth, santé | Non | Non | — | — | Aucune clé, aucun usage |

---

## 1. Localisation — `NSLocationWhenInUseUsageDescription`

**Pourquoi.** Trier les coiffeurs du plus proche au plus loin sur l'écran de recherche
(`/app/recherche`), filtrer par rayon, recentrer la carte sur l'utilisateur, et pré-remplir la
ville du compte via reverse géocodage.

**Où le code la lit.**
- `hooks/useGeolocation.ts::requestBrowserGeolocation()` — en natif, passe par
  `Geolocation.getCurrentPosition()` du plugin Capacitor plutôt que `navigator.geolocation`,
  ce qui évite la double invite (alerte système iOS **puis** invite WKWebView).
- Appelants : `components/ui/GeoPermissionModal.tsx`, `app/app/recherche/page.tsx`
  (`requestGeo`, `recenterOnMe`), `components/ui/LocationBar.tsx` (« Utiliser ma position »),
  `components/search/SearchModal.tsx` (`handleUseMyPosition`).

**Texte actuel** (identique dans `Info.plist` et `codemagic.yaml`) :

> CHAIR utilise votre position pour vous montrer les coiffeurs les plus proches de vous.

Exact et spécifique. Deux réserves mineures : le vouvoiement contredit le tutoiement de l'app
client (l'alerte système jure avec le reste de l'interface), et le texte gagnerait à préciser
« pendant que vous utilisez l'app ». Non bloquant.

**Quand elle est demandée — corrigé dans cette passe.**

*Avant* : `GeoPermissionModal` était monté par `components/layout/AppShell.tsx`, donc présent
sur **toutes** les pages de l'app, y compris la home affichée au lancement. En contexte natif,
son `useEffect` appelait `requestAndStore()` **automatiquement 1,5 s après le montage** — sans
aucune action de l'utilisateur. Résultat : l'alerte système iOS surgissait au lancement,
au-dessus de la home, avant même que le reviewer ait compris ce que fait l'app.

*Après* (`components/ui/GeoPermissionModal.tsx` réécrit) :
1. Le composant ne s'arme **que** sur `/app/recherche`, seul écran où la distance pilote
   réellement les résultats. La home filtre sur la ville du compte : elle n'a pas besoin du GPS.
2. L'alerte système n'apparaît **jamais sans geste explicite** — seul le bouton « Autoriser la
   localisation » de la feuille d'explication déclenche l'appel au plugin. Plus d'appel
   automatique en natif.
3. Avant même d'afficher l'explication, l'état de l'autorisation est relu sans la demander
   (`getGeoPermissionState()`, ajouté à `hooks/useGeolocation.ts`, qui s'appuie sur
   `Geolocation.checkPermissions()` en natif et sur la Permissions API sur le web) :
   - `granted` → rien à expliquer, on ne montre rien ;
   - `denied` → la popup système ne se rouvrira pas ; réinsister n'apporterait qu'un écran de
     plus à fermer, on ne montre rien ;
   - `prompt` / `unknown` → explication affichée après 1,8 s, une seule fois par appareil.
4. Le bouton secondaire est devenu « Chercher par ville » : le refus mène quelque part au lieu
   d'être un cul-de-sac.

**Comportement si refus — chemin vérifié dans le code.** L'app reste **pleinement
fonctionnelle**, ce qui est le scénario que le reviewer testera :

- `requestBrowserGeolocation()` rejette → `requestGeo()` (`app/app/recherche/page.tsx` l. 234)
  retourne `false`, `userLocation` reste `null`.
- La carte s'affiche centrée sur la France (`FRANCE_CENTER`), tous les résultats restent
  listés, la recherche « dans cette zone » fonctionne au déplacement de la carte.
- La recherche par ville est le chemin nominal, disponible à trois endroits :
  `SearchModal` (champ ville + `geocodeCity`), `SearchFiltersSheet`, et `LocationBar` sur la
  home (`CityAutocomplete` → `PUT /user/profile`).
- Aucune fonctionnalité n'est bloquée : consultation des profils, réalisations, avis,
  réservation, favoris, scan QR fonctionnent sans position.
- `LocationBar` affiche un message explicite en cas d'échec (« Position indisponible — vérifiez
  que la géolocalisation est autorisée. »).

**Reste à faire (hors périmètre) :** `components/search/SearchModal.tsx::handleUseMyPosition`
avale l'échec sans rien dire — l'utilisateur tape « Utiliser ma position » et rien ne se passe
visiblement. Risque **LOW** (le champ ville reste juste à côté), mais mérite un message.

---

## 2. Photothèque — `NSPhotoLibraryUsageDescription`

**Est-ce réellement nécessaire dans le build CLIENT ? Oui.** La question méritait d'être posée
— la publication de réalisations est bien une fonction PRO — mais la vérification donne un
usage client légitime et unique :

`frontend/app/app/compte/modifier/page.tsx` ligne 207 :

```
<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
```

C'est la **photo de profil du client**. C'est le seul `<input type="file">` de tout `app/app/`
(vérifié par grep sur l'arborescence complète). L'image passe par `ImageCropModal` puis
`POST /user/avatar` → Cloudinary.

Dans une WKWebView, ce champ ouvre la feuille système iOS « Photothèque / Prendre une photo /
Choisir un fichier ». La branche « Photothèque » justifie la clé — la retirer exposerait à un
plantage sur les chemins de code iOS qui l'exigent encore.

**Texte actuel :**

> CHAIR accède à vos photos pour publier une réalisation depuis votre galerie.

**Problème — risque MEDIUM (guideline 5.1.1).** Ce texte décrit une fonctionnalité **PRO qui
n'existe pas dans l'app client** : un client ne publie pas de réalisation. Un texte d'usage qui
promet autre chose que ce que fait l'app est exactement ce que 5.1.1 reproche, et met le
reviewer sur la piste d'une fonctionnalité qu'il ne trouvera pas.

**Correction recommandée** — à appliquer dans `codemagic.yaml` (workflow `chair-client-ios`,
étape « Configurer nom affiché + permissions caméra/photo (CHAIR) »), la CI écrasant le
`Info.plist` :

> CHAIR accède à vos photos pour que vous puissiez choisir votre photo de profil.

---

## 3. Appareil photo — `NSCameraUsageDescription`

**Nécessaire dans le build CLIENT ? Oui**, pour la même raison et par le même champ : la
feuille système ouverte par `accept="image/*"` propose « Prendre une photo », et HTML ne permet
pas de désactiver cette branche depuis le web. Sans la clé, ce choix fait planter l'app.

À noter : le scan de QR code (`/app/scan/[token]`) **n'utilise pas la caméra de l'app**. Le QR
est lu par l'appareil photo natif d'iOS, qui ouvre l'URL ; la page ne contient aucun
`getUserMedia`, aucun `BarcodeDetector` (vérifié par grep).

**Texte actuel :**

> CHAIR utilise l'appareil photo pour publier vos réalisations et vos stories.

**Problème — risque MEDIUM.** Même défaut qu'au § 2, en pire : « réalisations » **et**
« stories » sont deux fonctions PRO absentes de l'app client.

**Correction recommandée** (même endroit dans `codemagic.yaml`) :

> CHAIR utilise l'appareil photo pour que vous puissiez prendre votre photo de profil.

---

## 4. Notifications push

**Non déclarées, jamais demandées, et c'est correct pour ce build.** Vérifications :

- Aucune occurrence de `OneSignal` dans `frontend/` (code et `package.json`).
- Aucun fichier `.entitlements` dans `frontend/ios` — donc pas d'`aps-environment`.
- `frontend/ios/App/App/capacitor.config.json` : `packageClassList` = `["GeolocationPlugin"]`.
- `AppDelegate.swift` : aucun enregistrement aux notifications distantes.
- La table `push_subscriptions` et `NotificationService::sendPush()` (OneSignal) existent côté
  serveur mais ne sont alimentées par aucun client iOS.

Les notifications sont donc **in-app** (table `notifications`, écran
`/app/notifications`) et **par email** (`MailService`). L'écran de préférences
(`/app/notifications/preferences` ↔ table `notification_preferences`) reste pertinent : il
pilote ces deux canaux.

**Le jour où le push est activé**, il faudra : ajouter la capability Push Notifications, un
`aps-environment`, l'invite système au **moment utile** (après une première réservation, pas au
lancement), et repasser *Identifiers › Device ID* à « collecté / lié » dans le questionnaire
App Privacy.

---

## 5. App Tracking Transparency

**Ne pas déclarer `NSUserTrackingUsageDescription`, ne pas lier le framework, ne jamais appeler
`requestTrackingAuthorization`.** Aucun SDK publicitaire, analytics ou d'attribution n'est
présent ; aucune donnée n'est partagée avec un tiers à des fins de suivi. Demander
l'autorisation ATT sans motif est en soi un motif de rejet. Démonstration détaillée dans
`APP_PRIVACY_MAPPING.md` § 3.

---

## 6. Récapitulatif des actions restantes (hors périmètre de cet agent)

| # | Action | Fichier | Risque si ignoré |
|---|---|---|---|
| 1 | Reformuler `NSCameraUsageDescription` et `NSPhotoLibraryUsageDescription` pour décrire la photo de profil, pas les réalisations/stories | `codemagic.yaml` (workflow `chair-client-ios`) **et** `frontend/ios/App/App/Info.plist` pour rester cohérent | MEDIUM — 5.1.1 |
| 2 | Créer `PrivacyInfo.xcprivacy` pour la cible `App` (`UserDefaults` / `CA92.1`) | `frontend/ios/App/App/` | **HIGH** — rejet automatisé ITMS-91053 |
| 3 | Passer la localisation au tutoiement et préciser « pendant que vous utilisez l'app » | `codemagic.yaml` + `Info.plist` | LOW — cohérence de la DA |
| 4 | Message d'échec sur « Utiliser ma position » | `components/search/SearchModal.tsx` | LOW |
| 5 | Vérifier après build CI que le manifest et les textes sont bien dans l'`.ipa` | — | HIGH |
