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

echo "→ Icônes/splash depuis resources-pro/ (icon.png + splash.png requis)"
if [ ! -f resources-pro/icon.png ] || [ ! -f resources-pro/splash.png ]; then
  echo "✗ resources-pro/icon.png et/ou splash.png manquants — voir resources-pro/README.md"
  exit 1
fi
npx capacitor-assets generate --assetPath resources-pro --iconBackgroundColor '#0a0a0a' --splashBackgroundColor '#0a0a0a' --ios

PLIST="ios/App/App/Info.plist"

echo "→ Bundle ID"
sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = .*;/PRODUCT_BUNDLE_IDENTIFIER = app.getchair.pro;/g" ios/App/App.xcodeproj/project.pbxproj

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

/usr/libexec/PlistBuddy -c "Delete :UIBackgroundModes" "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :UIBackgroundModes array" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :UIBackgroundModes:0 string remote-notification" "$PLIST"

echo "✓ Projet iOS prêt pour CHAIR PRO (app.getchair.pro). Ouvre ios/App/App.xcodeproj dans Xcode."
