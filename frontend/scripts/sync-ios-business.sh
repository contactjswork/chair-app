#!/usr/bin/env bash
# Prépare entièrement le projet Xcode partagé (ios/) pour CHAIR BUSINESS —
# à lancer sur Mac avant d'ouvrir ios/App/App.xcodeproj dans Xcode.
# Même mécanique que sync-ios-chair.sh / sync-ios-pro.sh (3e binaire, gérants).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Config Capacitor CHAIR BUSINESS"
cp capacitor.business.config.ts capacitor.config.ts

echo "→ npx cap sync ios"
npx cap sync ios

# cap sync régénère ios/App/App/public/ depuis webDir — la page d'erreur
# hors-ligne committée est restaurée depuis git.
echo "→ Restauration page d'erreur hors-ligne (cap sync régénère public/)"
git checkout -- ios/App/App/public/error.html 2>/dev/null || true

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

echo "→ Icônes/splash depuis resources-business/ (icon.png + splash.png requis)"
if [ ! -f resources-business/icon.png ] || [ ! -f resources-business/splash.png ]; then
  echo "✗ resources-business/icon.png et/ou splash.png manquants — créer le dossier"
  echo "  (même format que resources-pro/ : icon.png 1024x1024, splash.png 2732x2732)"
  exit 1
fi
npx capacitor-assets generate --assetPath resources-business --iconBackgroundColor '#0a0a0a' --splashBackgroundColor '#0a0a0a' --ios

PLIST="ios/App/App/Info.plist"

echo "→ Bundle ID"
sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = .*;/PRODUCT_BUNDLE_IDENTIFIER = app.getchair.business;/g" ios/App/App.xcodeproj/project.pbxproj

# Le numéro de build se passe explicitement (voir sync-ios-chair.sh pour le
# pourquoi — « Redundant Binary Upload » du 27/08/2026) :
#   ./sync-ios-business.sh 3
if [ "$#" -ge 1 ]; then
  echo "→ Build number : $1 (fourni explicitement)"
  (cd ios/App && agvtool new-version -all "$1")
else
  CURRENT_BUILD=$(cd ios/App && agvtool what-version -terse 2>/dev/null || echo "?")
  echo "→ Build number inchangé ($CURRENT_BUILD)"
  echo "  ⚠ Vérifie sur App Store Connect qu'aucun build ne porte déjà ce numéro."
fi

echo "→ Nom affiché + permissions (CHAIR BUSINESS)"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName 'CHAIR BUSINESS'" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSCameraUsageDescription string 'CHAIR BUSINESS utilise l appareil photo pour les photos de votre salon.'" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :NSCameraUsageDescription 'CHAIR BUSINESS utilise l appareil photo pour les photos de votre salon.'" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string 'CHAIR BUSINESS accede a vos photos pour illustrer votre salon depuis votre galerie.'" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryUsageDescription 'CHAIR BUSINESS accede a vos photos pour illustrer votre salon depuis votre galerie.'" "$PLIST"

# Pas de géolocalisation côté gérant — retirer la clé plutôt que la laisser
# inutilisée (risque de rejet App Review).
/usr/libexec/PlistBuddy -c "Delete :NSLocationWhenInUseUsageDescription" "$PLIST" 2>/dev/null || true

BUILD_NUM=$(cd ios/App && agvtool what-version -terse 2>/dev/null || echo "?")
ACTUAL_URL=$(node -e "console.log(require('./ios/App/App/capacitor.config.json').server.url)" 2>/dev/null || echo "?")

echo ""
echo "════════════════════════════════════════════════════════"
echo "  CHAIR BUSINESS — app.getchair.business"
echo "  URL chargée : $ACTUAL_URL"
echo "  Build number : $BUILD_NUM"
echo "════════════════════════════════════════════════════════"
if [ "$ACTUAL_URL" != "https://www.getchair.app/business" ]; then
  echo "✗ ATTENTION : l'URL ne correspond pas à ce qui est attendu (https://www.getchair.app/business) !"
  echo "  Ne pas archiver tant que ce n'est pas corrigé."
  exit 1
fi
echo "✓ Vérifié — ouvre maintenant ios/App/App.xcodeproj dans Xcode et Archive."
