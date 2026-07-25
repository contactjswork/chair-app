#!/usr/bin/env bash
# Prépare entièrement le projet Xcode partagé (ios/) pour CHAIR (client) —
# à lancer sur Mac avant d'ouvrir ios/App/App.xcodeproj dans Xcode.
# Remplace localement ce que codemagic.yaml fait côté CI, pour ne plus
# dépendre de Codemagic : bundle ID, nom affiché, permissions, icônes/splash.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Config Capacitor CHAIR client"
cp capacitor.chair.config.ts capacitor.config.ts

echo "→ npx cap sync ios"
npx cap sync ios

echo "→ Icônes/splash depuis resources-chair/ (icon.png + splash.png requis)"
if [ ! -f resources-chair/icon.png ] || [ ! -f resources-chair/splash.png ]; then
  echo "✗ resources-chair/icon.png et/ou splash.png manquants — voir resources-chair/README.md"
  exit 1
fi
npx capacitor-assets generate --assetPath resources-chair --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff' --ios

PLIST="ios/App/App/Info.plist"

echo "→ Bundle ID"
sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = .*;/PRODUCT_BUNDLE_IDENTIFIER = app.getchair.client;/g" ios/App/App.xcodeproj/project.pbxproj

# Codemagic incrémentait automatiquement le build number à chaque build
# (lookup du dernier build App Store Connect + 1) — sans CI, personne ne le
# fait plus, donc chaque archive repartait de 1 et App Store Connect
# ignorait silencieusement les nouveaux uploads (déjà utilisé). On
# l'incrémente ici à chaque sync : ça monte toujours, jamais de doublon.
echo "→ Build number (incrémenté)"
(cd ios/App && agvtool next-version -all)

echo "→ Nom affiché + permissions (CHAIR)"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName CHAIR" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSCameraUsageDescription string 'CHAIR utilise l appareil photo pour publier vos realisations et vos stories.'" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :NSCameraUsageDescription 'CHAIR utilise l appareil photo pour publier vos realisations et vos stories.'" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string 'CHAIR accede a vos photos pour publier une realisation depuis votre galerie.'" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryUsageDescription 'CHAIR accede a vos photos pour publier une realisation depuis votre galerie.'" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSLocationWhenInUseUsageDescription string 'CHAIR utilise votre position pour vous montrer les coiffeurs les plus proches de vous.'" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :NSLocationWhenInUseUsageDescription 'CHAIR utilise votre position pour vous montrer les coiffeurs les plus proches de vous.'" "$PLIST"

echo "✓ Projet iOS prêt pour CHAIR (client, app.getchair.client). Ouvre ios/App/App.xcodeproj dans Xcode."
