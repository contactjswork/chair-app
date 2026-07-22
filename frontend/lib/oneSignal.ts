'use client';

// OneSignal ne s'initialise que dans le shell natif Capacitor (iOS/Android) —
// jamais dans le navigateur web, où le plugin Cordova n'est pas disponible.
function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

/**
 * Initialise OneSignal au démarrage de l'app (une seule fois).
 * ONESIGNAL_APP_ID injecté via next.config / variable publique.
 */
export async function initOneSignal(): Promise<void> {
  if (!isNativeApp()) return;

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) return;

  try {
    const { default: OneSignal } = await import('onesignal-cordova-plugin');
    OneSignal.initialize(appId);
    OneSignal.Notifications.requestPermission(true);
  } catch {
    // Plugin absent ou app lancée hors contexte natif — on ignore.
  }
}

/**
 * Lie l'appareil courant à notre user_id CHAIR (External User ID OneSignal).
 * Le backend cible ensuite ce même identifiant pour envoyer un push
 * (voir NotificationService::sendPush côté Laravel).
 */
export async function identifyOneSignalUser(userId: number): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const { default: OneSignal } = await import('onesignal-cordova-plugin');
    OneSignal.login(String(userId));
  } catch {
    // Plugin absent ou app lancée hors contexte natif — on ignore.
  }
}

/** À appeler à la déconnexion pour délier l'appareil du compte. */
export async function clearOneSignalUser(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const { default: OneSignal } = await import('onesignal-cordova-plugin');
    OneSignal.logout();
  } catch {
    // Plugin absent ou app lancée hors contexte natif — on ignore.
  }
}
