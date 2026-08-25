# Stratégie `server.url` — architecture, panne réseau, versionnage, release

Points 7, 8, 54, 55, 56, 59, 60. État au 25/08/2026, vérifié sur le code du
dépôt et sur les sources de Capacitor 8.4 installées dans `node_modules`.

---

## 1. Ce que les binaires embarquent réellement

**Rien du frontend.** Vérifié :

- `webDir: 'out'` dans les deux configs, mais **`frontend/out/` n'existe pas**
  (aucun `output: 'export'` dans `next.config.ts` ; `next build` produit
  `.next/`, jamais `out/`).
- La CLI Capacitor (`@capacitor/cli/dist/tasks/copy.js`, fonction
  `copyWebDir`) saute explicitement la copie quand `server.url` est défini et
  que le `webDir` n'existe pas : *« This is not an error because server.url is
  set in config »*. C'est un chemin prévu par Capacitor, pas un accident.
- Contenu réel de `frontend/ios/App/App/public/` (le dossier embarqué dans le
  bundle) : `cordova.js`, `cordova_plugins.js` (shims générés par cap sync)
  — et désormais `error.html` (voir §2). Aucune page CHAIR.

Le binaire n'est donc qu'une coquille : WKWebView + config + plugin
Geolocation + icônes/splash. Au lancement, `CAPBridgeViewController` charge
directement `https://www.getchair.app/app` (client) ou `/pro` (pro).

**Conséquence importante pour le versionnage (§4) : il n'y a JAMAIS de
décalage de version entre du code web embarqué et le site — il n'y a pas de
code web embarqué.** Tous les binaires, vieux ou récents, exécutent toujours
le dernier déploiement web.

## 2. Panne réseau au lancement — comportement et correction

### Avant (comportement constaté dans les sources Capacitor)

Si `www.getchair.app` est injoignable au lancement (mode avion, DNS, TLS,
timeout), WKWebView appelle `didFailProvisionalNavigation`
(`WebViewDelegationHandler.swift:149`). Sans `errorPath` configuré, le
handler se contente de deux `CAPLog.print` : **la WebView reste vide → écran
blanc (client) ou noir (pro) définitif**, sans message ni bouton. C'est le
scénario de rejet 2.1 classique (« l'app ne se lance pas »).

### `server.errorPath` existe bien en Capacitor 8 et fonctionne avec `server.url`

Preuves, dans les sources installées :

- Déclaration : `@capacitor/cli/dist/declarations.d.ts:609` —
  `errorPath?: string` (« Specify path to a local html page to display in
  case of errors », depuis 4.0).
- Parsing iOS : `CAPInstanceDescriptor.swift:99` lit `server.errorPath`.
- Résolution : `CAPInstanceConfiguration.swift:18` —
  `errorPathURL = localURL.appendingPathComponent(errorPath)` où `localURL` =
  `capacitor://localhost` (`CAPInstanceConfiguration.m:45`). Le scheme
  handler `capacitor://` reste enregistré même quand `server.url` est
  externe (`CAPBridgeViewController.swift:297`) et sert les fichiers depuis
  le dossier `public/` du bundle (`assetHandler.setAssetPath(appLocation)`).
- Déclenchement : `WebViewDelegationHandler.swift:139` (`didFail`) et `:150`
  (`didFailProvisionalNavigation`) → `webView.load(errorURL)`.

Donc : échec réseau → Capacitor charge `capacitor://localhost/error.html`
**depuis le disque, sans réseau**. Les erreurs **HTTP** (500, 404…) ne
déclenchent PAS ce mécanisme : une réponse serveur, même en erreur, est
rendue telle quelle (c'est le comportement WKWebView, seuls les échecs de
transport comptent).

### Ce qui a été mis en place

- `frontend/ios/App/App/public/error.html` — page autonome (zéro requête
  réseau), DA CHAIR : fond blanc/logotype texte, « Impossible de charger
  CHAIR. Vérifie ta connexion et réessaie. », bouton Réessayer ≥44 px, safe
  areas, anti double-tap. Le même fichier sert les deux binaires : il détecte
  le marqueur User-Agent `CHAIRPro` (posé par `appendUserAgent`, voir
  `lib/appContext.ts`) pour passer en thème sombre, vouvoiement et cible
  `/pro`. Binaire sans marqueur (build antérieur) → défaut client.
- **Le bouton ne fait pas `window.location.reload()`** : après l'échec, la
  WebView est sur `capacitor://localhost/error.html`, un reload rechargerait
  la page d'erreur elle-même. Il renavigue vers l'URL distante ; en cas de
  nouvel échec, Capacitor ré-affiche la page (boucle propre).
- `errorPath: 'error.html'` ajouté au bloc `server` des DEUX configs
  (`capacitor.chair.config.ts`, `capacitor.pro.config.ts`) + copie générée
  `capacitor.config.ts` resynchronisée.
- `frontend/ios/.gitignore` : `App/App/public` → `App/App/public/*` +
  `!App/App/public/error.html`, pour que la page soit **committée** et
  présente sur le Mac / en CI (le reste de `public/` reste ignoré). Sans ça,
  `errorPath` pointerait dans le vide sur un clone frais.
- Garde-fou : si un jour `out/` se met à exister (passage à
  `output: 'export'`), `cap copy` **efface `public/` avant de copier** —
  `error.html` devrait alors être ajouté au contenu de `out/` (ou recopié
  après sync). À garder en tête si l'architecture change.

## 3. Pourquoi cette architecture, risques App Store, recommandation

### Pourquoi `server.url`

Un seul déploiement web (Next.js sur www.getchair.app) sert le site, l'app
client et l'app pro. Chaque correctif est **immédiatement** en production
dans toutes les apps installées, sans rebuild Xcode, sans passage en review,
sans attendre que les utilisateurs mettent à jour. Pour une équipe d'une
personne sans Mac sous la main en continu, c'est ce qui rend le produit
maintenable.

### Risques, honnêtement

- **Capacitor lui-même documente `server.url` comme « not intended for use
  in production »** (`declarations.d.ts`, doc de `server.url`) : l'usage
  officiel est le live-reload de dev. Ça fonctionne — c'est le mode « remote
  shell » qu'utilisent aussi d'autres apps — mais on est hors du chemin
  nominal du framework, et un futur Capacitor pourrait le restreindre.
- **Guideline 2.1 (App Completeness)** : si www.getchair.app est en panne
  (hébergeur, DNS, certificat expiré) **pendant la review**, le reviewer voit
  la page d'erreur locale — mieux qu'un écran blanc, mais toujours un rejet
  probable. Le site doit être considéré comme de l'infra de prod critique
  pendant toute fenêtre de review : monitoring + certificat auto-renouvelé.
- **Guideline 4.2 (Minimum Functionality)** : une app 100 % WebView de site
  distant peut être requalifiée de « site web reconditionné ». Atténuants
  réels : plugin natif Geolocation, deux binaires distincts avec des
  parcours dédiés, comportement natif (safe areas, pas de chrome
  navigateur). Le risque ne peut pas être chiffré, il dépend du reviewer.
- **Panne réseau utilisateur** : couvert par §2 désormais.
- **Apple ne re-reviewe pas le contenu distant** : chaque déploiement web
  change l'app en production sans review. C'est l'avantage recherché, mais
  contractuellement le contenu doit rester conforme aux guidelines en
  continu (l'UGC est déjà couvert : signalement, blocage, ContentFilter).

### Chiffrage des deux options

| | `server.url` (actuel) | Bundle embarqué (`output: 'export'`) |
|---|---|---|
| Correctif web en prod | 1 déploiement (~minutes) | Build Xcode + upload + review (1–3 j) × 2 binaires, + adoption des mises à jour par les utilisateurs (des semaines) |
| Travail de migration | 0 | Important : le front utilise des routes dynamiques (`/app/coiffeur/[slug]`…), des redirections serveur, `next/image`, 2 routes API (`admin-auth`, `beta-auth`) — tout ça est incompatible ou à réécrire pour un export statique ; l'API resterait de toute façon distante |
| Panne du site | Page d'erreur locale, app inutilisable | Shell utilisable, données API indisponibles (même panne côté API probable) |
| Risque 4.2 | Réel, non chiffrable | Plus faible |
| Risque 2.1 pendant review | Site = point de défaillance unique | Réduit au backend |

### Recommandation

**Garder `server.url` pour cette soumission.** La migration vers un export
statique n'est pas un réglage : c'est un chantier (routes dynamiques,
redirections, images, routes API à sortir du front) qui retarderait la
soumission de plusieurs semaines pour un gain principalement défensif. Les
deux vrais risques restants se gèrent autrement : 2.1 par le monitoring du
site pendant la review (+ la page d'erreur locale désormais en place), 4.2
en mettant en avant dans les notes de review les fonctions natives et les
parcours propres à chaque binaire. Si un rejet 4.2 tombe malgré tout, la
réponse est produit (plus de natif), pas l'embarquement du même site dans le
binaire — un « site web reconditionné » embarqué reste un site web
reconditionné aux yeux d'Apple.

## 4. Splash / lancement — analyse (pas de flash blanc probable)

Séquence : LaunchScreen.storyboard (natif, instantané) → WKWebView →
chargement distant.

- **Storyboard** (`Base.lproj/LaunchScreen.storyboard`) : imageView `Splash`
  plein écran en `scaleAspectFill` (fond `systemBackgroundColor` jamais
  visible derrière une image 1366×1366 qui remplit l'écran). Les images sont
  régénérées par binaire par `capacitor-assets` dans les scripts de sync
  (`--splashBackgroundColor '#ffffff'` client, `'#0a0a0a'` pro, variantes
  dark comprises).
- **WebView** : `ios.backgroundColor` est défini dans les deux configs
  (`#ffffff` client, `#0a0a0a` pro) et appliqué à la WebView ET à sa
  scrollView (`CAPBridgeViewController.swift:308-310`) — sans lui, Capacitor
  retomberait sur `systemBackground` (blanc en clair). Android : idem via
  `android.backgroundColor`. Client : blanc → blanc → site blanc. Pro :
  sombre → sombre → `/pro` sombre. **Aucun flash blanc attendu, aucune
  modification nécessaire.**
- **`plugins.SplashScreen.launchShowDuration: 0` est inerte** : le plugin
  `@capacitor/splash-screen` n'est PAS installé (`package.json` ;
  `packageClassList` du config.json généré ne liste que `GeolocationPlugin`).
  Le splash affiché est uniquement le LaunchScreen iOS natif, qui disparaît
  dès que la WebView est posée. Bloc laissé en place (inoffensif), à savoir
  si on veut un jour tenir le splash jusqu'à la fin du chargement distant :
  il faudrait installer le plugin.

Reste le **délai réseau** entre la disparition du LaunchScreen et le premier
rendu du site : fond uni aux couleurs du binaire pendant ce temps. Acceptable ;
si on veut mieux un jour → installer `@capacitor/splash-screen` avec
`launchAutoHide: false` et masquer depuis le web au premier rendu.

## 5. Versionnage / vieux binaires vs site live (points 54-55)

### Ce que le shell natif consomme du site — la surface de contrat

1. **`GET https://www.getchair.app/app`** (resp. `/pro`) : doit répondre 200
   (ou rediriger en restant sur `getchair.app`/`www.getchair.app`, hosts
   couverts par `allowNavigation` — sinon éjection vers Safari).
2. **Le host** : `www.getchair.app` est figé dans chaque binaire installé.
3. C'est tout. Aucun endpoint API n'est appelé par le natif ; tout le reste
   (JS, appels API, routes) vient du site lui-même, toujours à jour.

### Règles de compatibilité ascendante (à respecter à chaque déploiement)

- **Ne jamais renommer ni abandonner le domaine `www.getchair.app`**, ni le
  faire rediriger vers un autre host : tous les binaires en circulation
  mourraient instantanément (et une redirection cross-host éjecte vers
  Safari). Changer de domaine = nouvelle soumission des deux apps + garder
  l'ancien domaine en redirection interne impossible → en pratique, interdit.
- **`/app` et `/pro` doivent toujours exister** (200 ou redirection interne).
- **Renommages de routes internes** : couverts — `next.config.ts` porte déjà
  les redirections 308 (`permanent: true`) de toutes les anciennes routes
  (`/feed` → `/app/feed`, `/dashboard/*` → `/pro/*`, etc.). Vérifié lignes
  133-164. À maintenir : toute route supprimée/renommée reçoit sa 308, on
  n'en retire jamais.
- **Contrat implicite avec les vieux shells** : ne pas supposer côté web la
  présence d'un plugin natif non embarqué dans les binaires existants (seul
  Geolocation existe), et continuer de traiter l'absence de marqueur UA
  comme 'unknown' (déjà le cas dans `lib/appContext.ts`).

### Mécanisme min-version, si un jour nécessaire (NON implémenté)

Le jour où un vieux binaire devient réellement incompatible (ex. nouveau
plugin natif indispensable) :

1. Le shell expose déjà sa version : le marqueur UA `CHAIRClient/1` /
   `CHAIRPro/1` — **incrémenter le suffixe à chaque évolution de contrat du
   shell** (prochain build avec un nouveau plugin → `/2`).
2. Côté web, `lib/appContext.ts` (ou un guard dans le layout `/app` et
   `/pro`) lit ce numéro et le compare à une constante
   `MIN_SHELL_VERSION` ; en dessous → écran plein « Mets à jour CHAIR »
   avec lien App Store, à la place du contenu.
3. Aucun appel réseau supplémentaire, pas de config distante à héberger : le
   site EST la config distante, c'est tout l'intérêt de l'architecture.
   Un binaire sans marqueur (builds pré-marqueur) compte comme version 0.

## 6. Release — lecture de `project.pbxproj` (vérifié, non compilable ici)

Configuration **Release** (cible App et projet) :

- `SWIFT_OPTIMIZATION_LEVEL = "-O"`, `SWIFT_COMPILATION_MODE = wholemodule`,
  `GCC` sans `-O0`, `VALIDATE_PRODUCT = YES`, `ENABLE_NS_ASSERTIONS = NO`,
  `DEBUG_INFORMATION_FORMAT = dwarf-with-dsym`. Conforme.
- `SWIFT_ACTIVE_COMPILATION_CONDITIONS = ""` en Release (pas de `DEBUG`).
- **`CAPACITOR_DEBUG`** : défini uniquement par `ios/debug.xcconfig`
  (`CAPACITOR_DEBUG = true`), qui n'est `baseConfigurationReference` QUE des
  deux configs **Debug**. En Release, `$(CAPACITOR_DEBUG)` dans Info.plist se
  résout en chaîne vide → `CapacitorBridge.isDevEnvironment` = false
  (vérifié dans `CapacitorBridge.swift:26-36`). Pas de mode debug résiduel.
- `webContentsDebuggingEnabled: false` dans les deux configs Capacitor.
- Entitlements : **aucun `CODE_SIGN_ENTITLEMENTS` référencé** — cohérent tant
  que les Universal Links ne sont pas activés (AASA conditionné à
  `APPLE_TEAM_ID`). Le jour où l'AASA est en ligne, il faudra créer
  l'entitlement Associated Domains dans Xcode (voir DEEPLINKS_SETUP.md).
- `PrivacyInfo.xcprivacy` : bien référencé dans `Resources` de la cible.
- `TARGETED_DEVICE_FAMILY = "1"` (iPhone seul) sur Debug ET Release.
- `MARKETING_VERSION = 1.0.0`, `CURRENT_PROJECT_VERSION = 1` — le build
  number est incrémenté par `agvtool` dans les scripts de sync.

**Limite honnête : rien de tout ceci n'a pu être compilé — machine Windows,
pas de Xcode.** À valider sur le Mac avant soumission :

1. `npm run ios:chair` (puis `ios:pro`) → vérifier que le récap affiche la
   bonne URL et que `ios/App/App/public/error.html` est toujours présent
   après le sync.
2. Test réel de la page d'erreur : lancer l'app en mode avion → page
   « Impossible de charger CHAIR », bouton Réessayer, puis réseau rétabli →
   Réessayer charge le site. Refaire en binaire PRO (thème sombre,
   vouvoiement).
3. Archive Release dans Xcode, puis inspecter l'IPA (`Show Package
   Contents`) : présence de `PrivacyInfo.xcprivacy`, de `public/error.html`,
   des icônes AppIcon sans transparence.
4. Vérifier qu'aucun profil de dev / entitlement inattendu n'est injecté à la
   signature (Automatic signing).
5. TestFlight sur appareil physique : lancement, splash sans flash, géoloc
   (client), User-Agent marqué (vérifiable via /app — le CookieBanner doit
   être masqué).

## 7. ACTION GÉRANT

- **Monitoring de www.getchair.app pendant toute fenêtre de review Apple**
  (uptime + expiration du certificat TLS). Où : chez l'hébergeur du front ou
  un service d'uptime externe pointé sur `https://www.getchair.app/app`.
  C'est LE point de défaillance unique de l'architecture.
- Aucune donnée juridique/financière requise par ce chantier.
