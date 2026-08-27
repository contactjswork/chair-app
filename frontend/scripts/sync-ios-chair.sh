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

echo "→ Icônes/splash depuis resources-chair/ (icon.png + splash.png requis)"
if [ ! -f resources-chair/icon.png ] || [ ! -f resources-chair/splash.png ]; then
  echo "✗ resources-chair/icon.png et/ou splash.png manquants — voir resources-chair/README.md"
  exit 1
fi
npx capacitor-assets generate --assetPath resources-chair --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff' --ios

PLIST="ios/App/App/Info.plist"

echo "→ Bundle ID"
sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = .*;/PRODUCT_BUNDLE_IDENTIFIER = app.getchair.client;/g" ios/App/App.xcodeproj/project.pbxproj

# Le numéro de build ne s'invente pas localement : il doit être STRICTEMENT
# supérieur au plus élevé déjà envoyé sur App Store Connect, tous postes
# confondus. Ce script l'incrémentait automatiquement à partir du fichier
# projet local — donc à partir d'une valeur qui pouvait être en retard sur la
# réalité (autre Mac, checkout plus ancien).
#
# Constaté le 27/08/2026 : archives numérotées 3 alors que les builds 4 et 5
# existaient déjà côté Apple, « Redundant Binary Upload » à chaque envoi, et
# le champ Build de Xcode qui semblait figé — agvtool écrit aussi la valeur
# EN DUR dans Info.plist, ce qui neutralisait toute correction manuelle.
#
# Le numéro se passe donc explicitement :   ./sync-ios-chair.sh 13
# Sans argument, le script n'y touche pas et rappelle simplement la valeur.
if [ "$#" -ge 1 ]; then
  echo "→ Build number : $1 (fourni explicitement)"
  (cd ios/App && agvtool new-version -all "$1")
else
  CURRENT_BUILD=$(cd ios/App && agvtool what-version -terse 2>/dev/null || echo "?")
  echo "→ Build number inchangé ($CURRENT_BUILD)"
  echo "  ⚠ Vérifie sur App Store Connect qu'aucun build ne porte déjà ce numéro,"
  echo "    sinon l'envoi sera refusé. Pour le fixer : $0 <numéro>"
fi

echo "→ Nom affiché + permissions (CHAIR)"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName CHAIR" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSCameraUsageDescription string 'CHAIR utilise l appareil photo pour te laisser prendre ta photo de profil directement depuis l app.'" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :NSCameraUsageDescription 'CHAIR utilise l appareil photo pour te laisser prendre ta photo de profil directement depuis l app.'" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string 'CHAIR accede a tes photos pour te laisser choisir ta photo de profil dans ta galerie.'" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryUsageDescription 'CHAIR accede a tes photos pour te laisser choisir ta photo de profil dans ta galerie.'" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSLocationWhenInUseUsageDescription string 'CHAIR utilise ta position pour te montrer les coiffeurs les plus proches de toi.'" "$PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :NSLocationWhenInUseUsageDescription 'CHAIR utilise ta position pour te montrer les coiffeurs les plus proches de toi.'" "$PLIST"

BUILD_NUM=$(cd ios/App && agvtool what-version -terse 2>/dev/null || echo "?")
ACTUAL_URL=$(node -e "console.log(require('./ios/App/App/capacitor.config.json').server.url)" 2>/dev/null || echo "?")

echo ""
echo "════════════════════════════════════════════════════════"
echo "  CHAIR (client) — app.getchair.client"
echo "  URL chargée : $ACTUAL_URL"
echo "  Build number : $BUILD_NUM"
echo "════════════════════════════════════════════════════════"
if [ "$ACTUAL_URL" != "https://www.getchair.app/app" ]; then
  echo "✗ ATTENTION : l'URL ne correspond pas à ce qui est attendu (https://www.getchair.app/app) !"
  echo "  Ne pas archiver tant que ce n'est pas corrigé."
  exit 1
fi
echo "✓ Vérifié — ouvre maintenant ios/App/App.xcodeproj dans Xcode et Archive."
