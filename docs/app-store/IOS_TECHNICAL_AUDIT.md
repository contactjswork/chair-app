# CHAIR CLIENT — Audit technique iOS / Capacitor

Audit de conformité technique en vue de la soumission App Store de **CHAIR CLIENT**
(`app.getchair.client`). Périmètre : configuration native iOS, configuration
Capacitor, configuration de build web. Les sujets contenu / UGC / compte /
juridique sont traités séparément.

- Date : 2026-08-24
- Cible auditée : `frontend/ios/`, `frontend/capacitor*.config.ts`, `frontend/next.config.ts`, `frontend/.env.production`
- Référentiel : App Store Review Guidelines (developer.apple.com/app-store/review/guidelines)
- Architecture : WebView Capacitor à `server.url` distant — l'app charge
  `https://www.getchair.app/app`. Aucun bundle web embarqué. Un seul plugin
  natif : `@capacitor/geolocation`.

---

## Synthèse des risques

| # | Constat | Guideline | Risque | État |
|---|---------|-----------|--------|------|
| 1 | `.env.local` écrase `.env.production` au `next build` → bundle production pointant sur `http://localhost:8000/api` | 2.1 | **BLOCKER** | Garde-fou de build ajouté |
| 2 | Build iPad activé (`TARGETED_DEVICE_FAMILY = "1,2"`) alors que l'UI bascule sur la mise en page **site web desktop** au-delà de 768 px | 4.2 / 2.1 | **BLOCKER** | À corriger — hors périmètre |
| 3 | Risque structurel « repackaged website » | 4.2 | **HIGH** | Évalué, mesures listées |
| 4 | Aucun Universal Link : pas d'`apple-app-site-association`, pas d'Associated Domains, pas de routage `appUrlOpen`. Les liens partagés ouvrent Safari, jamais l'app | 4.2 | **HIGH** | Documenté, à implémenter |
| 5 | `NEXT_PUBLIC_AUTH_BYPASS` : auto-connexion sur un compte de démo partagé, identifiants en clair dans le bundle | 2.1 / 5.1 | **HIGH** | Verrouillé à `false` dans `.env.production` |
| 6 | `NEXT_PUBLIC_BETA_ENABLED` : mur de mot de passe bêta sur le site | 2.1 | **HIGH** | Verrouillé à `false` dans `.env.production` |
| 7 | Textes de permission caméra/photothèque décrivant une fonction PRO inexistante côté client | 5.1.1 | **MEDIUM** | Corrigé dans `Info.plist` |
| 8 | Projet Xcode unique partagé CLIENT/PRO → risque d'archiver le mauvais icône / mauvais bundle ID | 2.3 | **MEDIUM** | Documenté, procédure obligatoire |
| 9 | `remotePatterns` images autorisant `http://localhost` en production | 2.1 / ATS | **LOW** | Corrigé dans `next.config.ts` |
| 10 | `CFBundleDevelopmentRegion = en` pour une app 100 % française | — | **LOW** | Corrigé (`fr`) |
| 11 | `UIRequiredDeviceCapabilities = armv7`, `config.xml` Cordova `<access origin="*" />` | — | **LOW** | Documenté, sans action |
| 12 | Aucune exception App Transport Security | 2.1 | **AUCUN** | Vérifié conforme |

---

## 1. Secrets et configuration de production

### Recherche effectuée

Balayage exhaustif de `frontend/` hors `node_modules` et `.next` sur :
clés Stripe (`sk_`, `rk_live`, `whsec_`), clés AWS (`AKIA…`), blocs PEM,
tokens GitHub/Slack, et les motifs `password|secret|api_key = "…"`.

**Résultat : aucune clé secrète, aucun token privé, aucun identifiant serveur
dans le frontend.** Le seul secret applicatif (clés MapKit) reste côté Laravel
et n'est exposé que sous forme de jeton court via `GET /api/mapkit-token` —
correct.

`app/api/admin-auth/route.ts` a été relu intégralement : il ne compare plus
aucun mot de passe et ne pose qu'un cookie marqueur non-privilégié, la
frontière de sécurité restant Sanctum côté Laravel. Rien à signaler.

### Variables `NEXT_PUBLIC_*` — inventaire complet

| Variable | Réellement publique ? | Commentaire |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Oui | URL d'API publique |
| `NEXT_PUBLIC_MAP_PROVIDER` | Oui | Interrupteur de moteur de carte |
| `NEXT_PUBLIC_AUTH_BYPASS` | Oui (valeur), **non (effet)** | Voir ci-dessous |
| `NEXT_PUBLIC_BETA_ENABLED` | Oui (valeur), **non (effet)** | Voir ci-dessous |
| `NEXT_PUBLIC_SKIP_ENV_CHECK` | Oui | Ajoutée par cet audit, échappatoire du garde-fou |

Aucune de ces variables ne transporte de secret. Deux d'entre elles portent en
revanche un effet inacceptable en production.

### CONSTAT 1 — BLOCKER — `.env.local` écrase `.env.production` au build

`frontend/.env.local` contient `NEXT_PUBLIC_API_URL=http://localhost:8000/api`.
Next.js charge `.env.local` avec une **priorité supérieure** à `.env.production`,
y compris pendant `next build`. Or `NEXT_PUBLIC_*` est **inliné à la
compilation** : environ 45 fichiers font
`process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'`.

Conséquence : un `npm run build` lancé sur la machine de développement produit
un bundle « production » qui interroge `http://localhost:8000/api`. Déployé,
l'app est **entièrement vide** pour tout utilisateur — et pour App Review, ce
qui est le motif de rejet 2.1 le plus courant (*App Completeness*). S'y ajoute
le fait que `.gitignore` contient `.env*` : **aucun fichier d'environnement ne
part avec le dépôt**, donc l'hébergeur de production doit impérativement
définir la variable lui-même.

Ce n'est pas un risque théorique : le garde-fou ajouté par cet audit a **échoué
au premier build réel** sur cette machine, exactement pour cette raison (trace
de test en §Corrections).

### CONSTAT 5 — HIGH — bypass de login avec identifiants de démo en clair

`contexts/AuthContext.tsx` (hors périmètre) :

```ts
const AUTH_BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';
const BYPASS_ACCOUNTS = {
  pro:    { email: 'test_new_coiffeur@test.com', password: 'chairdemo2026' },
  client: { email: 'client@gmail.com',           password: 'chairdemo2026' },
};
```

Ces identifiants sont dans le bundle JavaScript public, que le drapeau soit
actif ou non. Si `NEXT_PUBLIC_AUTH_BYPASS=true` au build de production, l'app
connecte automatiquement tout le monde sur un compte partagé : rejet immédiat,
et fuite de comptes réels de la base. La valeur est aujourd'hui `false` dans
`.env.local`, mais elle n'était déclarée **nulle part** dans `.env.production`.

### CONSTAT 6 — HIGH — mur de mot de passe bêta

`proxy.ts` gate tout le site derrière `/beta` quand
`NEXT_PUBLIC_BETA_ENABLED=true`. Les préfixes `/app` et `/pro` sont exemptés,
donc l'app native elle-même passe — mais **pas** les pages que l'app référence
et qu'App Review consultera : `/`, `/contact`, `/download`, `/parrainage/…`.
Un reviewer qui suit un lien depuis l'app tombe sur un mot de passe qu'il n'a
pas. Guideline 2.1 : le contenu doit être accessible sans identifiants
supplémentaires. La variable n'était, elle non plus, déclarée nulle part en
production.

### CONSTAT 9 — LOW — `http://localhost` autorisé pour l'optimiseur d'images

`next.config.ts` déclarait `remotePatterns` en `http` vers `localhost:8000` et
`127.0.0.1:8000` sans condition d'environnement. En production ces entrées
autorisent l'optimiseur d'images Next à émettre du trafic HTTP en clair depuis
la machine de déploiement, et toute image ainsi servie serait de toute façon
bloquée par App Transport Security dans la WebView iOS.

### Trafic non-HTTPS

Hors les deux entrées ci-dessus et les valeurs de repli `?? 'http://localhost…'`,
**aucun appel HTTP en clair** n'existe dans le code de production. Vérifié :

- MapKit JS : `https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js`
- Tuiles Leaflet de repli : `https://{s}.basemaps.cartocdn.com/…`
- Images distantes : `images.unsplash.com`, `i.pravatar.cc`, `res.cloudinary.com`,
  `api.getchair.app` — toutes en `https`
- `server.url` Capacitor : `https://www.getchair.app/app`, avec `cleartext: false`

---

## 2. App Transport Security

**Aucune clé `NSAppTransportSecurity` dans `Info.plist`.** Aucune
`NSAllowsArbitraryLoads`, aucune `NSExceptionDomains`, aucune
`NSAllowsLocalNetworking`.

C'est la posture la plus forte possible : ATS s'applique intégralement, tout le
trafic doit être TLS. Combiné à `cleartext: false` dans la config Capacitor,
rien n'est à corriger et **rien n'est à ajouter** — introduire une clé ATS,
même restrictive, ne ferait qu'ouvrir une question inutile en review.

**Aucune action.** Si un jour une exception devient nécessaire, elle doit être
limitée à un domaine précis et jamais globale.

---

## 3. Info.plist — revue clé par clé

| Clé | Valeur | Verdict |
|---|---|---|
| `CFBundleDisplayName` | `CHAIR` | OK, cohérent avec `appName` Capacitor |
| `CFBundleIdentifier` | `$(PRODUCT_BUNDLE_IDENTIFIER)` → `app.getchair.client` | OK |
| `CFBundleShortVersionString` | `$(MARKETING_VERSION)` → `1.0.0` | OK |
| `CFBundleVersion` | `$(CURRENT_PROJECT_VERSION)` → `1` | OK, incrémenté par le script de sync / la CI |
| `CFBundleDevelopmentRegion` | était `en` | **Corrigé → `fr`** |
| `LSRequiresIPhoneOS` | `true` | OK |
| `UILaunchStoryboardName` | `LaunchScreen` | OK, requis |
| `UISupportedInterfaceOrientations` | Portrait seul | OK, cohérent avec une UI mobile-first |
| `UISupportedInterfaceOrientations~ipad` | 4 orientations | Voir §4 |
| `UIRequiredDeviceCapabilities` | `armv7` | Voir constat 11 |
| `UIViewControllerBasedStatusBarAppearance` | `true` | OK |
| `CAPACITOR_DEBUG` | `$(CAPACITOR_DEBUG)` | Voir ci-dessous |
| `UIBackgroundModes` | **absente** | Correct — aucun traitement en arrière-plan, ne surtout pas la déclarer |
| `ITSAppUsesNonExemptEncryption` | **absente** | Voir checklist gérant |

### CONSTAT 7 — MEDIUM — textes de permission décrivant une fonction inexistante

Les trois permissions déclarées sont **toutes justifiées côté client**, mais
deux étaient mal décrites.

- `NSLocationWhenInUseUsageDescription` — justifiée et exacte. Usage réel :
  `hooks/useGeolocation.ts` appelle `Geolocation.getCurrentPosition()` via le
  plugin Capacitor, déclenché depuis `/app/recherche` (« coiffeurs près de
  moi »). Le passage par le plugin natif plutôt que `navigator.geolocation` est
  volontaire et correct : il évite la double popup WKWebView.
- `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` — justifiées
  **mais mal décrites**. Le seul usage côté CLIENT est le sélecteur de fichier
  `<input type="file" accept="image/*">` de `app/app/compte/modifier/page.tsx`
  (photo de profil) ; WKWebView propose alors « Prendre une photo » et
  « Photothèque », d'où la nécessité des deux clés. Or les textes annonçaient
  *« pour publier vos réalisations et vos stories »* — une fonction de
  **CHAIR PRO**, absente de l'app client. Guideline 5.1.1 exige un texte qui
  décrit l'usage réel ; un reviewer qui cherche « publier une story » dans
  CHAIR CLIENT ne la trouvera pas.

### CONSTAT 11 — LOW — reliquats sans effet

- `UIRequiredDeviceCapabilities = armv7` est la valeur par défaut du gabarit
  Capacitor. Elle n'a plus de sens sur un parc 100 % arm64. Elle ne bloque pas
  la validation aujourd'hui ; la retirer serait plus propre mais n'est pas
  urgent. **Aucune action prise** pour ne pas toucher une chaîne de build qui
  fonctionne.
- `ios/App/App/config.xml` contient un `<access origin="*" />` Cordova. Ce
  fichier est gitignoré, régénéré par `cap sync`, et sans effet en l'absence de
  plugin Cordova. **Aucune action.**
- `CAPACITOR_DEBUG` vaut `$(CAPACITOR_DEBUG)`, alimenté par
  `ios/debug.xcconfig` (`CAPACITOR_DEBUG = true`). Ce `xcconfig` n'est
  référencé que par les configurations **Debug** du projet ; en **Release** la
  variable est vide, donc l'inspecteur web reste désactivé dans l'archive.
  Confirmé aussi par `webContentsDebuggingEnabled: false` dans la config
  Capacitor. Conforme.

---

## 4. iPad — CONSTAT 2 — BLOCKER

### Fait établi

`ios/App/App.xcodeproj/project.pbxproj`, configurations Debug **et** Release :

```
TARGETED_DEVICE_FAMILY = "1,2";
```

`2` = iPad. Le build cible donc l'iPad. `Info.plist` déclare bien un
`UILaunchStoryboardName` et les quatre orientations iPad, donc l'archive
**passera la validation** et sera publiée comme app universelle — et
**App Review la testera sur iPad**.

### Pourquoi c'est un problème ici, concrètement

L'interface n'est pas simplement « conçue pour mobile » : au-delà du point de
rupture Tailwind `md` (768 px, soit **tout iPad, y compris en portrait**), le
site bascule délibérément sur sa mise en page **site web desktop**.

- `components/layout/BottomNav.tsx` : `className="… md:hidden"` — la barre
  d'onglets, c'est-à-dire l'élément le plus « app-like » de l'interface,
  **disparaît**.
- `components/layout/TopNav.tsx:44` : `className="hidden md:flex …"` avec un
  conteneur `max-w-6xl mx-auto px-8` — une barre de navigation de site web
  apparaît à la place.
- `components/layout/AppShell.tsx:14` : `<footer className="hidden md:block …">`
  — un **pied de page de site web** s'affiche.

Autrement dit : sur iPhone, CHAIR ressemble à une app ; **sur iPad, CHAIR est
littéralement le site web**, pied de page compris. C'est précisément la
démonstration que la guideline 4.2 cherche à sanctionner, servie au reviewer
sur l'appareil qu'il utilise pour tester.

### Recommandation — explicite

**Restreindre la soumission à l'iPhone.** Valider l'expérience iPad
supposerait de concevoir une vraie mise en page tablette (barre latérale,
grilles multi-colonnes, gestion du multitâche et du Slide Over) : ce n'est pas
un ajustement, c'est un chantier, et il n'apporte rien au lancement.

Correctif — `frontend/ios/App/App.xcodeproj/project.pbxproj`, **hors de mon
périmètre**, deux occurrences (lignes 312 et 333) :

```diff
-				TARGETED_DEVICE_FAMILY = "1,2";
+				TARGETED_DEVICE_FAMILY = "1";
```

Une fois fait, `UISupportedInterfaceOrientations~ipad` devient inerte et peut
être supprimée de `Info.plist` par cohérence (sans urgence).

Attention : ce réglage est réécrit à chaque `cap sync`/`cap add ios` si le
projet est régénéré. À vérifier avant chaque archive.

---

## 5. Universal Links / Deep Links — CONSTAT 4 — HIGH

### État réel aujourd'hui

Trois pièces sont nécessaires ; **aucune des trois n'existe**.

1. **Fichier `apple-app-site-association`** — `frontend/public/.well-known/`
   n'existe pas. Vérifié : aucun fichier AASA nulle part dans le dépôt.
2. **Associated Domains** — aucun fichier `.entitlements` dans `ios/`.
   Recherche `find ios -name "*.entitlements"` : zéro résultat. La capability
   n'est donc pas activée dans le projet Xcode.
3. **Routage du lien dans l'app** — `AppDelegate.swift` implémente bien
   `application(_:continue:restorationHandler:)` et le transmet à
   `ApplicationDelegateProxy`, mais **rien côté JavaScript n'écoute
   l'événement** : `@capacitor/app` n'est pas installé (`package.json` ne
   déclare que `@capacitor/geolocation`), et aucune occurrence de `appUrlOpen`
   n'existe dans le code.

**Conclusion : un lien partagé ouvre Safari, jamais l'app.** Y compris pour un
utilisateur qui a l'app installée.

### Ce que génèrent les liens partagés

`lib/share.ts` ne fabrique aucune URL — il se contente de mettre en forme
`{ title, text, url }` à partir d'une URL fournie par l'appelant. Les
appelants construisent, eux, des URLs sur des **routes historiques** :

- `app/app/feed/page.tsx:172` → `${window.location.origin}/realisation/${postId}`
- `app/pro/reservations/page.tsx:27` → `${window.location.origin}/avis/${token}`

Or `next.config.ts` redirige `/realisation/:id` → `/app/realisation/:id` et
`/avis/:token` → `/app/avis/:token` en 301. Point critique : **iOS ne suit pas
les redirections serveur pour décider d'ouvrir une app** — la correspondance
AASA se fait sur l'URL d'origine. Une future configuration devra donc couvrir
les **deux** familles de chemins.

### Ce qu'il faudrait pour que les liens ouvrent l'app

1. Publier `https://www.getchair.app/.well-known/apple-app-site-association`,
   servi en `application/json`, **sans extension de fichier**, en HTTPS, sans
   redirection. Un fichier déposé dans `frontend/public/.well-known/` est servi
   tel quel par Next.
   Contenu — le `appID` s'écrit `<TEAM_ID>.app.getchair.client` :

   ```json
   {
     "applinks": {
       "details": [
         {
           "appIDs": ["TEAM_ID.app.getchair.client"],
           "components": [
             { "/": "/app/*" },
             { "/": "/realisation/*" },
             { "/": "/avis/*" },
             { "/": "/salon/*" },
             { "/": "/coiffeur/*" },
             { "/": "/parrainage/*" },
             { "/": "/pro/*", "exclude": true }
           ]
         }
       ]
     }
   }
   ```

   > Ce fichier **n'a volontairement pas été créé**. Il exige l'Apple Team ID
   > réel, que je n'ai pas et que je n'inventerai pas : un AASA contenant un
   > identifiant erroné est **pire que son absence**, car le CDN d'Apple le met
   > en cache pendant plusieurs jours et casse durablement la fonctionnalité.
   > Voir la checklist gérant.

2. Activer **Associated Domains** dans Xcode (Signing & Capabilities) avec
   `applinks:www.getchair.app`, ce qui crée `App.entitlements`. L'App ID doit
   avoir la capability Associated Domains activée sur le portail développeur.

3. Installer `@capacitor/app` et router l'événement, sans quoi le lien ouvre
   l'app **sur sa page d'accueil** et perd le contenu partagé :

   ```ts
   App.addListener('appUrlOpen', ({ url }) => {
     const path = new URL(url).pathname;      // /realisation/42
     router.push(path.startsWith('/app') ? path : `/app${path}`);
   });
   ```

### Boucle Safari → app → Safari

Risque réel, à surveiller à l'implémentation, sur deux points.

- **La redirection apex.** `getchair.app` renvoie un 308 vers
  `www.getchair.app`. Le changement d'hôte est traité par Capacitor comme une
  navigation externe et **éjecte l'app entière vers Safari**. La config
  actuelle traite déjà correctement le problème : `server.url` pointe
  directement sur `https://www.getchair.app/app` et `allowNavigation` liste les
  deux hôtes. **À ne pas casser.** L'AASA doit être servi sur `www`, l'hôte
  déclaré dans les Associated Domains.
- **Le rebond classique.** Si l'app ouvre elle-même un lien `www.getchair.app`
  via `window.open`/`target="_blank"`, iOS ne rouvre pas l'app (comportement
  attendu) mais Safari se lance ; si une page y invite à revenir dans l'app, la
  boucle s'installe. Règle à tenir : **toute URL interne se navigue dans la
  WebView, jamais via `_blank`** — la convention est déjà appliquée côté PRO
  (commentaires explicites dans `OwnerChairWizard.tsx`, `pro/compte/page.tsx`,
  etc.), elle doit l'être aussi côté client (voir §6).

---

## 6. WebView / Minimum Functionality (4.2) — CONSTAT 3 — HIGH

Guideline 4.2 : *« Your app should include features, content, and UI that
elevate it beyond a repackaged website. »* Il faut être lucide : **CHAIR CLIENT
est aujourd'hui, techniquement, un site web distant dans une WebView.** Aucun
code applicatif n'est embarqué, aucune ressource n'est bundlée, le contenu est
identique au site à l'octet près. C'est le risque de rejet le plus structurel
du dossier, et le plus difficile à corriger dans l'urgence.

### Ce qui plaide en faveur de l'app

- **Géolocalisation native** — vrai bridge Capacitor (`Geolocation.getCurrentPosition`),
  vraie popup système iOS, pas la popup web. C'est le seul argument
  véritablement *natif* du dossier, et il est réel.
- **Aucun chrome de navigateur** — pas de barre d'URL, pas de boutons Safari,
  expérience plein écran.
- **Navigation par onglets** — `BottomNav` à 5 onglets avec pastille de
  notifications non lues, retour haptique tenté au tap.
- **Safe areas iOS** — `viewportFit: 'cover'` dans `app/layout.tsx` et
  utilitaires `pb-safe-nav` / `env(safe-area-inset-*)` appliqués dans 14
  fichiers (bottom sheets, bannières, CTA sticky, modales).
- **Bottom sheets et gestes** — `BookingSheet`, `ShareSheet`,
  `GeoPermissionModal`, `SiretVerificationSheet` : grammaire d'interaction
  mobile, pas de modale de site web.
- **Onboarding et splash applicatifs** — `OnboardingCarousel` 4 écrans au
  premier lancement, `SplashScreen` géré côté app (`launchShowDuration: 0`
  côté Capacitor pour éviter le double splash), plus le launch screen natif
  clair/sombre.
- **Icône et identité natives** — icône 1024×1024 dédiée, non-placeholder.
- **Zoom désactivé, `userScalable: false`** — comportement d'app, pas de page.

### Ce qui l'affaiblit

- **Aucune notification push.** Le plugin OneSignal a été retiré en juillet.
  C'est, de loin, la fonctionnalité native la plus attendue d'une app de
  réservation — et son absence est ce qu'un reviewer remarque en premier quand
  il cherche « qu'est-ce que cette app fait que le site ne fait pas ».
- **Aucun mode hors-ligne.** Réseau coupé = écran blanc. Pas de cache, pas
  d'écran d'erreur applicatif. Un reviewer teste souvent en conditions
  dégradées.
- **Contenu strictement identique au site web** — même URL, même HTML, même
  CSS. Aucune différenciation.
- **Des liens éjectent vers Safari depuis des écrans clients.** Recensés :
  - `components/ui/BookingCTA.tsx:27` — pour un coiffeur non-indépendant, le
    bouton **« Réserver au salon » ouvre une URL externe dans Safari**. La
    fonction cœur de l'app est donc, dans ce cas, déléguée à un site tiers.
    C'est le plus dommageable des quatre.
  - `components/ui/ProfileActions.tsx:151`, `components/ui/PublicProfileAbout.tsx:117,127`
    — Instagram / TikTok. Légitime, mais à faire passer par une vue in-app.
  - `components/ui/PublicProfileServices.tsx:60`, `app/app/salon/[slug]/page.tsx:46`.
  - `components/ui/ShareSheet.tsx:94` — repli `window.open(webFallback, '_blank')`
    déclenché par un `setTimeout` de 900 ms **sans annulation** : si l'app
    Instagram s'ouvre, le repli s'exécute quand même au retour et éjecte vers
    Safari. Peu fréquent (`navigator.share` prend la main sur iOS), mais réel.
- **Retour haptique inopérant.** `BottomNav.tsx:35` appelle `navigator.vibrate()`,
  **non supporté par WKWebView sur iOS** : le geste le plus « app-like » de la
  barre d'onglets ne produit rien sur iPhone.
- **Sur iPad, la façade tombe entièrement** — voir §4. C'est le point qui peut
  transformer un 4.2 discutable en 4.2 démontré.

### Évaluation honnête du risque

**HIGH.** Pas rédhibitoire, mais réel. Ce qui sauve le dossier, si quelque
chose le sauve, ce n'est pas la technique : c'est que CHAIR rend un service
substantiel et spécifique (portfolios, avis certifiés, réservation, recherche
géolocalisée) qui n'est pas un simple habillage de site vitrine. Un reviewer
qui voit une app de réservation cohérente, fluide et plein écran passe
généralement. Un reviewer qui l'ouvre sur iPad et y voit un pied de page de
site web ne passe pas.

### Mesures classées par rapport efficacité / coût

1. **Passer le build en iPhone-only** (§4). Coût : une ligne. Supprime la
   démonstration la plus directe de 4.2. **À faire avant toute soumission.**
2. **Rapatrier les liens externes en vue in-app.** Installer
   `@capacitor/browser` et ouvrir Instagram/TikTok/URL de réservation salon
   dans un `SFSafariViewController` plutôt que d'éjecter vers Safari :
   l'utilisateur ne quitte jamais l'app. Coût faible, gain 4.2 net.
   Cas particulier de `BookingCTA` : y aiguiller de préférence vers le tunnel
   de réservation interne quand il existe.
3. **Rétablir les notifications push.** C'est la mesure qui abaisse le plus le
   risque 4.2, parce qu'elle rend l'app *fonctionnellement* supérieure au site
   — et non pas seulement mieux emballée. Coût réel, à arbitrer.
4. **Haptique native.** `@capacitor/haptics` en remplacement de
   `navigator.vibrate`, sur les onglets, la confirmation de réservation, la
   mise en favori. Coût très faible, effet perceptible immédiatement.
5. **Écran hors-ligne applicatif.** Détecter la perte de réseau et afficher un
   écran CHAIR au lieu de l'erreur WebView. Coût faible, évite un rejet 2.1
   bête si le reviewer teste en réseau dégradé.
6. **Universal Links** (§5). Un lien partagé qui ouvre l'app sur la bonne fiche
   est un comportement que seul une app peut offrir.

Les mesures 1, 2, 4 et 5 sont peu coûteuses et cumulables ; prises ensemble,
elles font passer le dossier d'« un site web dans une coquille » à « une app
qui utilise le web comme rendu » — ce qui est une position défendable.

**Rappel de méthode :** aucune de ces mesures ne doit être conditionnée à la
détection du reviewer. Pas de fonctionnalité masquée puis réactivée après
validation — c'est un motif de bannissement, pas de rejet.

---

## 7. Écran de lancement et identité

### Icône

`ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` :
**1024×1024, 8 bits, colorType 2 (RGB) — pas de canal alpha.** Conforme
(ITMS-90717 rejette les icônes avec transparence). Poids 466 Ko, il s'agit
bien d'une icône dessinée, **pas du placeholder Capacitor**. Le catalogue
n'expose qu'une entrée `universal` 1024×1024, ce qui est le format attendu par
Xcode moderne — toutes les tailles dérivées sont générées à la compilation.
Rien à corriger.

### Splash

`Splash.imageset` : six fichiers, 2732×2732, variantes claire et sombre en
1x/2x/3x. Généré par `@capacitor/assets` depuis `resources-chair/splash.png`.
`launchShowDuration: 0` côté Capacitor pour laisser l'app gérer son propre
`SplashScreen` — cohérent, pas de double splash. Le launch screen natif
(`LaunchScreen.storyboard`) est bien déclaré. Rien à corriger.

### Cohérence des identifiants

| Source | `appId` / bundle | Nom |
|---|---|---|
| `frontend/capacitor.chair.config.ts` | `app.getchair.client` | `CHAIR` |
| `frontend/capacitor.config.ts` (copie active) | `app.getchair.client` | `CHAIR` |
| `frontend/ios/App/App/capacitor.config.json` (généré) | `app.getchair.client` | `CHAIR` |
| `project.pbxproj` (`PRODUCT_BUNDLE_IDENTIFIER`, Debug + Release) | `app.getchair.client` | — |
| `Info.plist` (`CFBundleDisplayName`) | — | `CHAIR` |

**Cohérence totale, aucun écart.** `capacitor.config.ts` à la racine est
actuellement la copie exacte de la variante CLIENT (identique octet pour
octet, `diff` vide).

`ios/App/App/capacitor.config.json` est bien gitignoré (`ios/.gitignore`) et
régénéré par `cap sync`. Son contenu correspond exactement à
`capacitor.chair.config.ts`, plus la clé `packageClassList: ["GeolocationPlugin"]`
ajoutée par `cap sync` — ce qui **confirme** que `@capacitor/geolocation` est
le seul plugin natif embarqué. Conforme aux permissions déclarées.

### CONSTAT 8 — MEDIUM — le projet Xcode est partagé entre CLIENT et PRO

`ios/App/App.xcodeproj` sert aux **deux** apps. Le bundle ID, le
`CFBundleDisplayName`, les textes de permission et **les icônes/splash** sont
réécrits à chaque build par `scripts/sync-ios-chair.sh` ou
`scripts/sync-ios-pro.sh` (ou par les workflows Codemagic). L'état actuellement
committé n'est donc que le résidu du dernier sync exécuté.

Conséquence concrète : ouvrir Xcode et archiver **sans avoir lancé
`npm run ios:chair` au préalable** peut produire une archive CLIENT portant
l'icône, le nom ou le bundle ID de PRO. Le script contient déjà un garde-fou
qui refuse de continuer si `server.url` ne vaut pas `https://www.getchair.app/app` —
mais ce garde-fou ne couvre ni l'icône ni le nom affiché.

**Procédure obligatoire avant toute archive CLIENT :**

```bash
cd frontend && npm run ios:chair     # sync config + icônes + plist + build number
# puis seulement : ouvrir ios/App/App.xcodeproj et Archive
```

### CONSTAT 10 — LOW — région de développement

`CFBundleDevelopmentRegion` valait `en` alors que l'app est intégralement en
français. Sans effet sur la review, mais c'est la langue par défaut du bundle.

---

## 8. Corrections appliquées

Toutes dans mon périmètre. **Rien n'a été committé.**

### `frontend/ios/App/App/Info.plist`

- `CFBundleDevelopmentRegion` : `en` → `fr`.
- Textes de permission réécrits pour décrire l'usage **réel côté client**, au
  tutoiement conforme à la DA :

  | Clé | Avant | Après |
  |---|---|---|
  | `NSCameraUsageDescription` | « …publier vos réalisations et vos stories. » | « CHAIR utilise l'appareil photo pour te laisser prendre ta photo de profil directement depuis l'app. » |
  | `NSPhotoLibraryUsageDescription` | « …publier une réalisation depuis votre galerie. » | « CHAIR accède à tes photos pour te laisser choisir ta photo de profil dans ta galerie. » |
  | `NSLocationWhenInUseUsageDescription` | vouvoiement | « CHAIR utilise ta position pour te montrer les coiffeurs les plus proches de toi. » |

**Preuve de test** — validation XML et relecture des clés après édition :

```
XML OK - keys: 20
CFBundleDevelopmentRegion = fr
NSCameraUsageDescription = CHAIR utilise l'appareil photo pour te laisser prendre ta photo de profil directement depuis l'app.
NSPhotoLibraryUsageDescription = CHAIR accède à tes photos pour te laisser choisir ta photo de profil dans ta galerie.
NSLocationWhenInUseUsageDescription = CHAIR utilise ta position pour te montrer les coiffeurs les plus proches de toi.
```

Accents UTF-8 préservés, plist bien formé.

> **Attention — cette correction sera écrasée.** `frontend/scripts/sync-ios-chair.sh`
> et `codemagic.yaml` (tous deux **hors de mon périmètre**) réécrivent
> `NSCameraUsageDescription` et `NSPhotoLibraryUsageDescription` via
> `PlistBuddy` à **chaque** build, avec les anciens textes. Ils doivent être
> mis à jour en miroir, sinon le binaire soumis portera à nouveau la
> description d'une fonction inexistante. Voir §9.

### `frontend/next.config.ts`

- **Garde-fou de build production** : `next build` échoue désormais si
  `NEXT_PUBLIC_API_URL` est absente ou non-HTTPS, plutôt que de produire
  silencieusement un binaire pointant sur `localhost`. Échappatoire :
  `NEXT_PUBLIC_SKIP_ENV_CHECK=true`.
- `remotePatterns` HTTP vers `localhost:8000` / `127.0.0.1:8000` désormais
  conditionnés à `NODE_ENV !== 'production'`.

**Preuve de test 1 — le garde-fou déclenche** (et a immédiatement révélé le
constat 1, `.env.local` prenant le pas sur `.env.production`) :

```
$ npx next build
⨯ Failed to load next.config.ts
Error: [CHAIR] NEXT_PUBLIC_API_URL doit être en HTTPS en production
       (reçu : http://localhost:8000/api).
EXIT=1
```

**Preuve de test 2 — aucune régression avec une URL valide** :

```
$ NEXT_PUBLIC_API_URL=https://api.getchair.app/api npx next build
...
ƒ Proxy (Middleware)
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
EXIT=0
```

**Preuve de test 3 — typage et lint** :

```
$ npx tsc --noEmit      → TSC_EXIT=0     (zéro erreur)
$ npx eslint next.config.ts → ESLINT_EXIT=0
```

### `frontend/.env.production`

Fichier complété et documenté. `NEXT_PUBLIC_AUTH_BYPASS=false` et
`NEXT_PUBLIC_BETA_ENABLED=false` sont désormais **déclarés explicitement**
plutôt que laissés à leur valeur de repli. Un rappel en tête du fichier
signale qu'il est gitignoré et que l'hébergeur doit définir ces variables
lui-même.

### Fichiers de mon périmètre volontairement non modifiés

- `frontend/capacitor.chair.config.ts` — **correct en l'état.** `server.url`
  HTTPS, `cleartext: false`, `allowNavigation` correctement limité,
  `webContentsDebuggingEnabled: false`, `allowsLinkPreview: false`. Le
  commentaire sur la redirection apex documente un piège réel. Ne pas y
  toucher.
- `frontend/ios/App/App/capacitor.config.json` — fichier **généré**, gitignoré,
  conforme à sa source. Le modifier à la main serait annulé au prochain `cap sync`.
- `frontend/public/.well-known/` — **non créé délibérément**, faute d'Apple
  Team ID réel. Justification en §5.

---

## 9. Reste à faire — hors de mon périmètre

Signalé sans y toucher, d'autres agents travaillant en parallèle.

| Fichier | Action | Risque si non fait |
|---|---|---|
| `frontend/ios/App/App.xcodeproj/project.pbxproj` | `TARGETED_DEVICE_FAMILY = "1,2"` → `"1"` (lignes 312 et 333) | **BLOCKER** — testé sur iPad, où l'app est le site web |
| `frontend/scripts/sync-ios-chair.sh` | Aligner les textes `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` sur ceux du `Info.plist` corrigé | MEDIUM — la correction est écrasée à chaque build |
| `codemagic.yaml` (workflow `chair-client-ios`) | Idem | MEDIUM — idem en CI |
| `frontend/contexts/AuthContext.tsx` | Retirer `BYPASS_ACCOUNTS` et le bypass avant soumission | HIGH — identifiants réels dans le bundle public |
| `frontend/components/ui/BookingCTA.tsx` | Remplacer `target="_blank"` par une vue in-app (`@capacitor/browser`) | HIGH — fonction cœur déléguée à Safari (4.2) |
| `ProfileActions.tsx`, `PublicProfileAbout.tsx`, `PublicProfileServices.tsx`, `app/app/salon/[slug]/page.tsx` | Idem pour les liens réseaux sociaux | MEDIUM |
| `frontend/components/ui/ShareSheet.tsx:94` | Annuler le repli `setTimeout` 900 ms si la page perd le focus | LOW |
| `frontend/components/layout/BottomNav.tsx:35` | `navigator.vibrate` → `@capacitor/haptics` | LOW — inopérant sur iOS |
| `frontend/package.json` | Ajouter `@capacitor/app` (deep links) et `@capacitor/browser` (liens in-app) | Prérequis des points ci-dessus |
| `frontend/.env.local` | Ne jamais l'utiliser pour un build de production | **BLOCKER** — écrase `.env.production` |

---

## 10. Checklist gérant — informations que je ne peux pas fournir

Éléments manquants qui ne relèvent pas du code et que je refuse d'inventer.

1. **Apple Team ID** (10 caractères, App Store Connect → Membership). Requis
   pour composer l'`appID` de l'`apple-app-site-association` (§5). Sans lui, le
   fichier ne peut pas être écrit — un Team ID erroné casse les Universal Links
   pour plusieurs jours à cause du cache CDN d'Apple.
2. **Déclaration de conformité export (`ITSAppUsesNonExemptEncryption`).** La
   clé est absente d'`Info.plist`, donc App Store Connect posera la question à
   chaque upload. L'app n'utilise que HTTPS, ce qui relève normalement de
   l'exemption — mais c'est une **déclaration légale** qui engage l'éditeur :
   elle doit être faite par le gérant, pas par un agent. Une fois la réponse
   arrêtée, la clé peut être ajoutée à `Info.plist` pour ne plus être
   interrogée.
3. **URL de la politique de confidentialité** à renseigner dans App Store
   Connect (guideline 5.1.1(i) : le lien doit exister dans l'app **et** dans la
   fiche). La page `/confidentialite` existe côté site ; l'URL publique exacte
   à déclarer doit être confirmée.
4. **Compte de démonstration pour App Review** — identifiants d'un compte
   client fonctionnel à fournir dans App Store Connect. Ne pas réutiliser les
   comptes de la base de démo dont les mots de passe traînent dans le code.
5. **Arbitrage push** — décider si les notifications push reviennent avant ou
   après le premier passage en review (§6, mesure 3). Si oui, il faudra une
   nouvelle clé `NSUserNotification*`, un plugin natif et une entitlement APNs.
6. **Arbitrage iPad** — confirmer la restriction à l'iPhone (§4). Recommandé.

---

*Audit limité à la conformité technique iOS / Capacitor. Ne couvre ni le
contenu généré par les utilisateurs (1.2), ni la suppression de compte
(5.1.1(v)), ni les paiements (3.1), traités séparément.*
