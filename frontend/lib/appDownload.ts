// Source unique des liens de téléchargement CHAIR — ne jamais dupliquer ces
// URLs ailleurs dans le code. Tant que l'app n'est pas publiée, les liens
// App Store / Play Store restent vides volontairement : un lien mort est pire
// qu'un état "bientôt disponible" honnête (voir AppDownload.tsx).
//
// À REMPLIR dès la mise en ligne publique :
//   APP_STORE_URL  = "https://apps.apple.com/app/idXXXXXXXXXX"
//   PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.getchair.client"

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
