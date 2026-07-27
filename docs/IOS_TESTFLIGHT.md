# CHAIR sur TestFlight — préparation et procédure

Écrit le 2026-07-16. CHAIR est du **Next.js + Capacitor** (pas React Native /
Expo — voir correction en tête de la session correspondante). Deux apps
distinctes existent déjà dans le même repo : **CHAIR** (client,
`app.getchair.client`) et **CHAIR PRO** (`app.getchair.pro`). Décision actée :
on garde ce schéma d'identifiants (cohérent avec le domaine réellement
possédé, `getchair.app`) et on prépare les **deux** apps pour TestFlight.

## Audit iOS — ce qui existe déjà / ce qui manque

| Point | État |
|---|---|
| `@capacitor/ios` (^8.4.1) | ✅ déjà en dépendance |
| `capacitor.chair.config.ts` / `capacitor.pro.config.ts` | ✅ existent, appId/appName corrects |
| Dossier `ios/` généré et testé (les deux apps) | ✅ vérifié localement cette session — `app.getchair.client` et `app.getchair.pro` génèrent chacun un projet Xcode avec le bon bundle ID (confirmé dans `project.pbxproj`) |
| Icône app (1024×1024) | ❌ aucun fichier source trouvé — bloquant pour générer les assets, pas pour builder |
| Splash screen source | ❌ aucun fichier source trouvé — idem |
| `@capacitor/assets` (générateur d'icônes/splash) | ✅ installé cette session |
| Notifications push (OneSignal) | 🟡 plugin installé (`onesignal-cordova-plugin`), bloqué sur les clés OneSignal de Julien (connu depuis une session précédente) |
| Permissions iOS (caméra, photothèque, localisation, background push) | ✅ automatisées dans `codemagic.yaml` (PlistBuddy) pour les deux apps — localisation uniquement côté client, PRO n'a aucun code de géoloc |
| Version app (`MARKETING_VERSION`) | ✅ `1.0.0`, automatisé dans `codemagic.yaml` pour les deux apps (`agvtool new-marketing-version`) |
| Dépendances incompatibles iOS | Aucune trouvée — tout le stack (Cloudinary, Stripe côté web, QR, upload) passe par le navigateur embarqué (WebView), rien de natif spécifique à vérifier côté iOS |
| `NEXT_PUBLIC_API_URL` en production | ✅ `.env.production` pointe déjà vers `https://api.getchair.app/api` (pas localhost) |
| CORS backend vs WebView | ✅ pas de risque — en mode `server.url` distant, la WebView charge réellement `https://getchair.app`, donc l'origine des requêtes est `https://getchair.app`, déjà dans `allowed_origins` de `backend/config/cors.php`. Pas de `capacitor://localhost` à ajouter (ça ne s'applique qu'en mode bundle local, pas utilisé ici) |
| Stripe Checkout dans l'app iOS | ⚠️ **Risque réel, pas bloquant pour un premier test interne.** `app/pro/chair-plus/page.tsx` fait `window.location.href = checkout_url` — ça ouvre Stripe Checkout **dans la WebView de l'app**. Pour du contenu numérique déverrouillé in-app, Apple (guideline 3.1.1) exige normalement In-App Purchase, pas un processeur de paiement externe affiché dans l'appli. **Sans conséquence pour un test interne** (TestFlight "Internal Testers" n'a aucune App Review). **Bloquant si vous ajoutez des testeurs externes ou soumettez à l'App Store** — il faudra soit basculer CHAIR+ sur StoreKit côté iOS, soit retirer le bouton d'achat de l'app iOS et rediriger vers le web (modèle "reader app" à valider avec Apple) |
| Suppression de compte accessible in-app | ✅ CHAIR (client) : lien fonctionnel `/app/compte/supprimer` depuis `/app/compte`. ❌ **CHAIR PRO : aucune page de suppression de compte trouvée dans `app/pro/**`**, alors que l'inscription existe. L'endpoint API existe côté backend mais rien ne le relie côté PRO. Pas bloquant pour un test interne, **bloquant pour une soumission App Store publique de CHAIR PRO** (guideline 5.1.1(v)) |

### Point d'architecture important : mode "remote URL"

Les deux `capacitor.*.config.ts` pointent vers `server.url: 'https://getchair.app/app'` (ou `/pro`) — l'app iOS n'embarque **pas** le code buildé localement, elle charge le site en ligne dans une WebView native. Conséquence concrète : **tester sur TestFlight = tester ce qui est déployé en production sur getchair.app à cet instant**, pas tes derniers changements locaux non déployés. Pour tester une modif, il faut d'abord la déployer sur `getchair.app`, puis relancer l'app (pas besoin de rebuilder l'app iOS pour chaque changement web — c'est même l'intérêt de ce mode). Si un jour vous voulez un mode 100% offline-capable, il faudra retirer `server.url` et servir `webDir: 'out'` en local — hors scope ici.

## Configuration préparée cette session

- `package.json` → `version: "1.0.0"` (le build number, lui, se gère au niveau Xcode/App Store Connect à chaque soumission — voir plus bas, pas dans ce fichier)
- `resources-chair/` et `resources-pro/` créés avec un README expliquant exactement quoi déposer
- `@capacitor/assets` installé (génère toutes les tailles d'icônes/splash iOS requises depuis une seule image source)
- `codemagic.yaml` — pipeline CI complet pour les deux apps (voir section Codemagic)

### Ce qu'il te reste à fournir (je ne peux pas les générer)
- `frontend/resources-chair/icon.png` (1024×1024) + `splash.png` (2732×2732)
- `frontend/resources-pro/icon.png` + `splash.png`
- Une fois déposés : `npx capacitor-assets generate --ios` (voir README de chaque dossier pour la commande exacte par app)

## Permissions — uniquement ce qui est réellement utilisé

| Permission | Utilisée dans CHAIR ? | Clé Info.plist |
|---|---|---|
| Caméra | ✅ upload photo réalisation, story | `NSCameraUsageDescription` |
| Photothèque (lecture) | ✅ choisir une image existante | `NSPhotoLibraryUsageDescription` |
| Localisation (usage ponctuel) | ✅ recherche géolocalisée "coiffeurs près de moi" | `NSLocationWhenInUseUsageDescription` |
| Notifications push | 🟡 prévu (OneSignal), pas encore activé | Pas de clé Info.plist — juste la capability "Push Notifications" + "Background Modes > Remote notifications" à cocher dans Xcode |
| Micro, contacts, bluetooth, etc. | ❌ jamais utilisés | Ne rien déclarer |

Ces clés doivent être ajoutées dans `ios/App/App/Info.plist` **une fois ce fichier généré** (donc après `npx cap add ios`, sur Mac ou via Codemagic). Exemple de valeurs françaises, orientées usage réel (Apple rejette les descriptions vagues type "l'app a besoin de la caméra") :

```xml
<key>NSCameraUsageDescription</key>
<string>CHAIR utilise l'appareil photo pour publier vos réalisations et vos stories.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>CHAIR accède à vos photos pour publier une réalisation depuis votre galerie.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>CHAIR utilise votre position pour vous montrer les coiffeurs les plus proches de vous.</string>
```

## Ce qui se fait sur Windows / ce qui exige un Mac

| Étape | Windows | Mac requis | Cloud CI (Codemagic) |
|---|---|---|---|
| Éditer `capacitor.*.config.ts`, `package.json` | ✅ | | |
| Préparer icône/splash sources | ✅ (n'importe quel éditeur d'image) | | |
| Créer le compte Apple Developer Program | ✅ (web) | | |
| Créer les app records dans App Store Connect | ✅ (web) | | |
| `npx cap add ios` (génère le projet Xcode) | ❌ | ✅ | ✅ (automatisé dans le pipeline) |
| `pod install` / CocoaPods | ❌ | ✅ | ✅ (automatisé) |
| Build + signature + archive Xcode | ❌ | ✅ | ✅ (automatisé) |
| Upload vers TestFlight | ❌ | ✅ (Xcode ou Transporter) | ✅ (automatisé, `submit_to_testflight: true`) |
| Installer sur l'iPhone via TestFlight | ✅ (app TestFlight sur iPhone, rien à voir avec Windows/Mac) | | |

**Conclusion : sans Mac physique, Codemagic (ou un service équivalent — Bitrise, GitHub Actions avec runner macOS) est le seul chemin réaliste.** EAS Build ne s'applique pas ici (spécifique à Expo). Codemagic a un support natif Capacitor/Ionic — c'est le choix le plus direct.

## Procédure complète, dans l'ordre

1. **Compte Apple Developer Program** (si pas déjà fait) — [developer.apple.com](https://developer.apple.com), 99$/an, paiement par carte, validation sous 24-48h généralement. Fait depuis Windows, aucun logiciel requis.
2. **App Store Connect** — créer deux app records :
   - CHAIR, bundle ID `app.getchair.client`
   - CHAIR PRO, bundle ID `app.getchair.pro`
   (web, depuis Windows — [appstoreconnect.apple.com](https://appstoreconnect.apple.com) > My Apps > +)
3. **Créer une clé API App Store Connect** (App Store Connect > Users and Access > Integrations > App Store Connect API) — nécessaire pour que Codemagic signe et publie automatiquement sans intervention manuelle à chaque build. Télécharger le fichier `.p8`, noter l'Issuer ID et le Key ID.
4. **Compte Codemagic** — [codemagic.io](https://codemagic.io), connecter le repo GitHub/GitLab du projet.
5. Dans Codemagic > Teams > Integrations > App Store Connect, ajouter la clé API de l'étape 3 sous le nom `chair_asc_key` (nom déjà référencé dans `codemagic.yaml`).
6. Déposer les images source dans `resources-chair/` et `resources-pro/`, générer les assets (`npx capacitor-assets generate --ios`), commit + push.
7. Dans Codemagic, lancer le workflow `chair-client-ios` (ou `chair-pro-ios`) — première exécution : génère le dossier `ios/`, installe les pods, signe automatiquement (grâce à l'intégration App Store Connect), build, uploade sur TestFlight.
8. Dans App Store Connect > TestFlight, créer un groupe de testeurs internes ("Internal Testers"), t'y ajouter avec ton Apple ID.
9. Sur ton iPhone : installer l'app **TestFlight** depuis l'App Store, ouvrir l'invitation reçue par email (ou lien direct depuis App Store Connect), installer CHAIR.

**Premier build = le plus lent** (génération du projet iOS + résolution des profils de signature, ~15-25 min sur Codemagic). Les suivants sont plus rapides une fois le cache npm/CocoaPods chaud.

## Coûts

| Poste | Coût |
|---|---|
| Apple Developer Program | 99 $/an — obligatoire, aucun moyen de le contourner pour TestFlight |
| Codemagic | Palier gratuit ~500 min de build/mois (largement suffisant pour des builds occasionnels) ; au-delà, abonnements à partir d'environ 28 $/mois — à vérifier sur codemagic.io au moment de s'inscrire, les tarifs évoluent |
| Alternative si accès à un Mac plus tard | 0 $ supplémentaire (juste le Developer Program) |

## Prochaine étape concrète

Il ne manque que : (1) les 4 images sources (icône + splash × 2 apps), (2) la création du compte Apple Developer si pas déjà fait, (3) la clé API App Store Connect à brancher dans Codemagic. Dès que ces trois éléments sont là, le premier build TestFlight peut partir sans intervention supplémentaire de ma part.

## À traiter avant une soumission App Store publique (pas avant)

Ces deux points ne bloquent pas le premier test interne sur ton iPhone, seulement une soumission publique ou l'ajout de testeurs externes :

1. **Stripe Checkout dans l'app iOS** — décider si CHAIR+ passe par StoreKit sur iOS, ou si le bouton d'achat est retiré de l'app iOS (achat uniquement sur le web).
2. **Suppression de compte CHAIR PRO** — ajouter un lien de suppression de compte accessible depuis `app/pro/profil` (ou une page paramètres dédiée), sur le modèle de `/app/compte/supprimer` côté client. L'API existe déjà côté backend, il ne manque qu'un lien + confirmation côté PRO.
