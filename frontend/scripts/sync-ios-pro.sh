#!/usr/bin/env bash
# Prépare entièrement le projet Xcode partagé (ios/) pour CHAIR PRO —
# à lancer sur Mac avant d'ouvrir ios/App/App.xcodeproj dans Xcode.
# Remplace localement ce que codemagic.yaml fait côté CI, pour ne plus
# dépendre de Codemagic : bundle ID, nom affiché, permissions, icônes/splash.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Config Capacitor CHAIR PRO"
cp capacitor.pro.config.ts capacitor.config.ts

echo "→ npx cap sync ios"
npx cap sync ios

# cap sync régénère ios/App/App/public/ depuis webDir — la page d'erreur
# hors-ligne committée (server.errorPath des configs Capacitor) est donc
# écrasée/supprimée à chaque sync : on la restaure depuis git.
echo "→ Restauration page d'erreur hors-ligne (cap sync régénère public/)"
git checkout -- ios/App/App/public/error.html 2>/dev/null || true

# Garde-fou : sans ces fichiers/réglages, le build partirait sans push,
# sans page d'erreur ou sans manifeste privacy — refuser d'archiver.
echo "→ Vérification du bundle natif (entitlements push, error.html, privacy)"
for f in ios/App/App/App.entitlements ios/App/App/public/error.html ios/App/App/PrivacyInfo.xcprivacy; do
  if [ ! -f "$f" ]; then
    echo "✗ $f manquant — ne pas archiver (restaure-le : git checkout -- $f)"
    exit 1
  fi
done
if ! grep -q "CODE_SIGN_ENTITLEMENTS = App/App.entitlements;" ios/App/App.xcodeproj/project.pbxproj; then
  echo "✗ CODE_SIGN_ENTITLEMENTS absent du pbxproj — le push ne serait pas embarqué"
  exit 1
fi

echo "→ Icônes/splash depuis resources-pro/ (icon.png + splash.png requis)"
if [ ! -f resources-pro/icon.png ] || [ ! -f resources-pro/splash.png ]; then
  echo "✗ resources-pro/icon.png et/ou splash.png manquants — voir resources-pro/README.md"
  exit 1
fi
npx capacitor-assets generate --assetPath resources-pro --iconBackgroundColor '#0a0a0a' --splashBackgroundColor '#0a0a0a' --ios

PLIST="ios/App/App/Info.plist"

echo "→ Bundle ID"
sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = .*;/PRODUCT_BUNDLE_IDENTIFIER = app.getchair.pro;/g" ios/App/App.xcodeproj/project.pbxproj

# Codemagic incrémentait automatiquement le build number à chaque build
# (lookup du dernier build App Store Connect + 1) — sans CI, personne ne le
# fait plus, donc chaque archive repartait de 1 et App Store Connect
# ignorait silencieusement les nouveaux uploads (déjà utilisé). On
# l'incrémente ici à chaque sync : ça monte toujours, jamais de doublon.
echo "→ Build number (incrémenté)"
(cd ios/App && agvtool next-version -all)

echo "→ Nom affiché + permissions (CHAIR PRO)"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName 'CHAIR PRO'" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSCameraUsageDescription string 'CHAIR PRO utilise l appareil photo pour publier vos realisations et vos stories.'" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :NSCameraUsageDescription 'CHAIR PRO utilise l appareil photo pour publier vos realisations et vos stories.'" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string 'CHAIR PRO accede a vos photos pour publier une realisation depuis votre galerie.'" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryUsageDescription 'CHAIR PRO accede a vos photos pour publier une realisation depuis votre galerie.'" "$PLIST"

# PRO n'a aucun code de géolocalisation (recherche fauteuil par ville/adresse
# saisie, pas de "près de moi") — retirer la clé plutôt que la laisser
# inutilisée (risque de rejet App Review).
/usr/libexec/PlistBuddy -c "Delete :NSLocationWhenInUseUsageDescription" "$PLIST" 2>/dev/null || true

BUILD_NUM=$(cd ios/App && agvtool what-version -terse 2>/dev/null || echo "?")
ACTUAL_URL=$(node -e "console.log(require('./ios/App/App/capacitor.config.json').server.url)" 2>/dev/null || echo "?")

echo ""
echo "════════════════════════════════════════════════════════"
echo "  CHAIR PRO — app.getchair.pro"
echo "  URL chargée : $ACTUAL_URL"
echo "  Build number : $BUILD_NUM"
echo "════════════════════════════════════════════════════════"
if [ "$ACTUAL_URL" != "https://www.getchair.app/pro" ]; then
  echo "✗ ATTENTION : l'URL ne correspond pas à ce qui est attendu (https://www.getchair.app/pro) !"
  echo "  Ne pas archiver tant que ce n'est pas corrigé."
  exit 1
fi
echo "✓ Vérifié — ouvre maintenant ios/App/App.xcodeproj dans Xcode et Archive."
