// Source unique des liens de téléchargement CHAIR — ne jamais dupliquer ces
// URLs ailleurs dans le code. Tant que l'app n'est pas publiée, les liens
// App Store / Play Store restent vides volontairement : un lien mort est pire
// qu'un état "bientôt disponible" honnête (voir AppDownload.tsx).
//
// ───────────────────────────────────────────────────────────────────────────
// JOUR DE LA PUBLICATION — CE QU'IL FAUT BASCULER, EXACTEMENT
//
// 1. Renseigner APP_STORE_URL ci-dessous avec l'URL de la fiche
//    App Store, visible dans App Store Connect → l'app → Distribution, ou
//    reconstructible : https://apps.apple.com/fr/app/chair/id<APPLE_ID>
//    L'APPLE_ID est l'« Apple ID » numérique affiché dans App Store Connect
//    → Informations générales de l'app.
// 2. Renseigner PLAY_STORE_URL le jour de la sortie Android :
//    https://play.google.com/store/apps/details?id=app.getchair.client
//    (l'identifiant vient de frontend/capacitor.chair.config.ts → appId).
//    Tant qu'Android n'est pas publié, LAISSER VIDE : le badge Google Play
//    n'est rendu que si la constante est non vide.
// 3. Rien d'autre à toucher. isAppPublished() passe alors à true et cela
//    suffit à basculer, sans autre modification :
//      - components/ui/AppDownload.tsx : remplace le bloc « Bientôt sur
//        l'App Store et Google Play / L'application est en cours de
//        déploiement » par les badges stores réels ;
//      - app/download/page.tsx : redirige automatiquement vers le store de
//        l'OS détecté au lieu d'afficher la page d'attente ;
//      - components/ui/AppBanner.tsx : le bandeau « Ouvrir dans l'app »
//        pointe vers le store au lieu de /download.
//
// ATTENTION avant publication : le bloc « bientôt disponible » ne doit jamais
// être visible DEPUIS l'app native (Apple 2.1 — une app ne peut pas se
// présenter comme non terminée). C'est déjà géré par le garde `isNativeApp()`
// en tête de AppDownload.tsx ; ne pas le retirer.
// ───────────────────────────────────────────────────────────────────────────

export const APP_STORE_URL  = '';
export const PLAY_STORE_URL = '';

// Lien de démo/prévisualisation à utiliser tant que l'app n'est pas publiée
// (ex: lien TestFlight public si Julien en crée un). Laissé vide pour l'instant.
export const PREVIEW_APP_URL = '';

export function isAppPublished(): boolean {
  return !!APP_STORE_URL || !!PLAY_STORE_URL;
}

export type DetectedOS = 'ios' | 'android' | 'other';

export function detectOS(): DetectedOS {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

export function storeUrlFor(os: DetectedOS): string {
  if (os === 'ios') return APP_STORE_URL;
  if (os === 'android') return PLAY_STORE_URL;
  return '';
}
