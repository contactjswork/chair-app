// Notifications push — module central côté app.
//
// Toute la mécanique push passe par ici : état de permission, enregistrement
// du token APNs/FCM auprès du backend, désenregistrement au logout, et les
// deux listeners runtime (réception au premier plan, tap sur une notification).
//
// ⚠️ DISPONIBILITÉ DU PLUGIN — À LIRE AVANT DE MODIFIER.
// Les binaires CHAIR CLIENT / CHAIR PRO chargent le site distant via
// `server.url` : le code web est toujours à jour, mais le plugin natif
// @capacitor/push-notifications n'existe QUE dans les binaires compilés après
// son ajout (prochain build TestFlight). Sur un binaire actuel,
// Capacitor.isPluginAvailable('PushNotifications') renvoie false — et sur le
// web il n'y a pas de shell natif du tout. Chaque fonction de ce module doit
// donc se dégrader en silence ('unavailable' / no-op), jamais lever.
//
// CONTRAT AVEC LE BACKEND (data.url) :
// une notification push peut embarquer dans son payload une clé `url` — un
// chemin interne relatif ("/app/rendez-vous", "/pro/agenda"). Au tap, ce
// module la valide via safeInternalPath() puis navigue. Toute évolution de ce
// contrat se fait ICI et dans NotificationService::sendPush (backend), nulle
// part ailleurs. Voir docs/PUSH_NOTIFICATIONS.md.

import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type PushNotificationSchema,
  type ActionPerformed,
  type Token,
} from '@capacitor/push-notifications';
import { push as pushApi } from './api';
import { safeInternalPath } from './auth';
import { getAppContext } from './appContext';

/** Token push actuellement enregistré auprès du backend (natif uniquement). */
const PUSH_TOKEN_KEY = 'chair_push_token';

export type PushPermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';

export type PushRegisterResult = 'registered' | 'denied' | 'unavailable' | 'error';

/** Vrai uniquement dans un shell natif dont le binaire embarque le plugin. */
export function isPushAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');
  } catch {
    return false;
  }
}

/**
 * État de la permission de notification.
 * 'unavailable' = web, binaire ancien sans le plugin, ou rendu serveur —
 * dans tous ces cas, aucune UI push ne doit s'afficher.
 */
export async function getPushPermissionState(): Promise<PushPermissionState> {
  if (!isPushAvailable()) return 'unavailable';
  try {
    const { receive } = await PushNotifications.checkPermissions();
    if (receive === 'granted') return 'granted';
    if (receive === 'denied') return 'denied';
    // 'prompt' et 'prompt-with-rationale' (Android 13+) : même traitement.
    return 'prompt';
  } catch {
    return 'unavailable';
  }
}

/** Token push enregistré localement (null sur web / jamais enregistré). */
export function getStoredPushToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * `PushNotifications.register()` ne renvoie pas le token : il arrive de
 * manière asynchrone via l'événement 'registration' (ou 'registrationError').
 * On emballe l'aller-retour dans une promesse, bornée à 10 s — sans réseau,
 * APNs ne répond jamais et un `await` non borné gèlerait le bouton d'opt-in.
 */
function registerForToken(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const cleanup: Array<() => void> = [];

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup.forEach((off) => off());
      fn();
    };

    const timer = setTimeout(
      () => settle(() => reject(new Error('push registration timeout'))),
      10_000
    );
    cleanup.push(() => clearTimeout(timer));

    PushNotifications.addListener('registration', (token: Token) => {
      settle(() => resolve(token.value));
    }).then((handle) => cleanup.push(() => { handle.remove(); }));

    PushNotifications.addListener('registrationError', (err) => {
      settle(() => reject(new Error(err?.error ?? 'push registration error')));
    }).then((handle) => cleanup.push(() => { handle.remove(); }));

    PushNotifications.register().catch((e) => settle(() => reject(e)));
  });
}

/**
 * Envoie le token au backend et le mémorise localement.
 *
 * `app` : identité du binaire (lib/appContext.ts). Un token APNs n'est valable
 * que pour le bundle qui l'a obtenu — le backend en déduit le topic d'envoi.
 * Fiable ici : tout binaire embarquant le plugin push embarque aussi le
 * marqueur UA (les deux datent du même build), donc jamais 'unknown' en
 * pratique ; si ça arrivait, on omet le champ et le backend prend son défaut.
 *
 * Le backend n'accepte que platform 'ios' aujourd'hui (envoi APNs uniquement) :
 * sur Android, l'appel prendra un 422 traité comme un échec silencieux — à
 * élargir avec FCM le jour du build Android.
 */
async function registerTokenWithBackend(token: string): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') throw new Error('platform not supported yet');
  const context = getAppContext();
  await pushApi.register({
    token,
    platform: 'ios',
    ...(context === 'client' || context === 'pro' ? { app: context } : {}),
  });
  try {
    localStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch { /* ignore */ }
}

/**
 * Parcours complet d'opt-in : vérifie la permission, la demande si besoin
 * (c'est ICI que la popup système iOS apparaît — à n'appeler que sur un
 * geste utilisateur explicite, jamais au chargement), enregistre l'appareil
 * auprès d'APNs/FCM puis pousse le token au backend.
 */
/**
 * Détail du dernier échec d'enregistrement, en français, destiné à être
 * affiché à l'utilisateur.
 *
 * Sans ça, un échec était totalement muet : le bouton revenait à son état
 * initial sans un mot, et personne — pas même nous — ne pouvait savoir si
 * c'était la permission, le réseau, la session expirée ou un refus d'Apple.
 * Un opt-in silencieusement cassé est pire qu'un opt-in absent.
 */
let lastRegisterError: string | null = null;

export function getLastPushError(): string | null {
  return lastRegisterError;
}

/** Traduit une erreur technique en une phrase actionnable. */
function describeRegisterError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');

  if (/timeout/i.test(msg)) {
    return "Apple n'a pas répondu. Vérifie ta connexion et réessaie — si le problème persiste, les notifications ne sont peut-être pas encore activées pour cette version de l'app.";
  }
  if (/no valid .?aps-environment|entitlement/i.test(msg)) {
    return "Cette version de l'app n'est pas autorisée à recevoir des notifications. Une mise à jour est nécessaire.";
  }
  if (/401|unauthenticated/i.test(msg)) {
    return 'Ta session a expiré. Reconnecte-toi puis réessaie.';
  }
  if (/network|fetch|connexion/i.test(msg)) {
    return 'Connexion impossible. Vérifie ta connexion internet et réessaie.';
  }
  return msg ? `L'activation a échoué (${msg}).` : "L'activation a échoué. Réessaie dans un instant.";
}

export async function requestAndRegister(): Promise<PushRegisterResult> {
  lastRegisterError = null;
  if (!isPushAvailable()) return 'unavailable';
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return 'denied';

    const token = await registerForToken();
    await registerTokenWithBackend(token);
    return 'registered';
  } catch (err) {
    lastRegisterError = describeRegisterError(err);
    // Trace console : le seul moyen de diagnostiquer un échec sur un appareil
    // réel (Safari → Développement → l'iPhone, une fois branché au Mac).
    console.warn('[push] enregistrement impossible :', err);
    return 'error';
  }
}

/**
 * Désenregistrement best-effort — appelé AVANT la révocation du jeton API au
 * logout (l'appel DELETE est authentifié : après /logout il prendrait un 401).
 * Ne lève jamais. On ne retire PAS les listeners runtime ici : le tap sur une
 * notification et le toast au premier plan doivent continuer de fonctionner
 * si l'utilisateur se reconnecte dans la même session d'app.
 */
export async function unregister(): Promise<void> {
  const token = getStoredPushToken();
  if (!token) return; // web, plugin absent, ou jamais enregistré : rien à faire
  try {
    await pushApi.unregister(token);
  } catch { /* best-effort : le backend purge aussi par user_id à la suppression de compte */ }
  try {
    localStorage.removeItem(PUSH_TOKEN_KEY);
  } catch { /* ignore */ }
}

// ── Listeners runtime ─────────────────────────────────────────────────

let listenersInstalled = false;

/**
 * Navigation depuis une notification : uniquement un chemin interne validé.
 * `window.location.assign` plutôt que le router Next : ce module vit hors
 * React, et un rechargement complet est acceptable (l'app revient souvent
 * du fond, la page cible doit de toute façon recharger ses données).
 */
function navigateFromNotification(data: unknown): void {
  const url = (data as { url?: unknown } | null | undefined)?.url;
  const path = safeInternalPath(typeof url === 'string' ? url : null);
  if (path) window.location.assign(path);
}

/**
 * Toast interne au premier plan — DOM pur, volontairement hors React (ce
 * module est importé par des composants mais ne doit dépendre d'aucun arbre
 * de rendu). Sobre, DA CHAIR : fond noir, texte blanc, pas d'emoji.
 *
 * Choix de présentation au premier plan (documenté, cohérent avec
 * presentationOptions: ['badge'] des 3 configs Capacitor) : iOS n'affiche
 * PAS la bannière système quand l'app est ouverte — seul ce toast s'affiche,
 * donc jamais de doublon bannière + toast. En arrière-plan, la bannière
 * système normale s'affiche (presentationOptions ne concerne que le premier
 * plan).
 */
function showForegroundToast(notification: PushNotificationSchema): void {
  const title = (notification.title ?? '').trim();
  const body = (notification.body ?? '').trim();
  if (!title && !body) return;

  // Un seul toast à la fois : le nouveau remplace l'ancien.
  document.getElementById('chair-push-toast')?.remove();

  const toast = document.createElement('button');
  toast.id = 'chair-push-toast';
  toast.type = 'button';
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = [
    'position:fixed',
    'top:calc(env(safe-area-inset-top, 0px) + 10px)',
    'left:16px',
    'right:16px',
    'z-index:9999',
    'background:#171717',
    'color:#fff',
    'border:none',
    'border-radius:16px',
    'padding:14px 18px',
    'min-height:44px',
    'text-align:left',
    'box-shadow:0 8px 30px rgba(0,0,0,0.25)',
    'cursor:pointer',
    'transform:translateY(-8px)',
    'opacity:0',
    'transition:transform .25s ease, opacity .25s ease',
  ].join(';');

  if (title) {
    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:700;line-height:1.3';
    t.textContent = title;
    toast.appendChild(t);
  }
  if (body) {
    const b = document.createElement('div');
    b.style.cssText = 'font-size:12px;color:#a3a3a3;line-height:1.35;margin-top:2px';
    b.textContent = body;
    toast.appendChild(b);
  }

  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 260);
  };

  toast.addEventListener('click', () => {
    dismiss();
    navigateFromNotification(notification.data);
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  setTimeout(dismiss, 5000);
}

/**
 * Installe les listeners runtime — idempotent, no-op hors natif ou sans le
 * plugin. Monté une fois par session d'app (voir PushBootstrap dans
 * components/ui/PushOptInCard.tsx, rendu par AppShell).
 */
export function installPushListeners(): void {
  if (listenersInstalled || !isPushAvailable()) return;
  listenersInstalled = true;

  try {
    // App au premier plan : toast interne (voir showForegroundToast).
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      showForegroundToast(notification);
    });

    // Tap sur la notification (bannière système, centre de notifications) :
    // deep link interne via data.url — le contrat avec le backend.
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      navigateFromNotification(action.notification?.data);
    });
  } catch {
    listenersInstalled = false;
  }
}

/**
 * Resynchronisation silencieuse au démarrage : si la permission est déjà
 * accordée ET qu'un token a déjà été enregistré ET que l'utilisateur est
 * connecté, on ré-enregistre — les tokens APNs/FCM tournent, et le backend
 * doit connaître le plus récent. Aucune popup : la permission est déjà
 * 'granted'. Best-effort, jamais bloquant.
 */
export async function syncRegistrationIfGranted(): Promise<void> {
  if (!isPushAvailable()) return;
  if (!getStoredPushToken()) return; // jamais opté-in sur cet appareil
  let apiToken: string | null = null;
  try {
    apiToken = localStorage.getItem('chair_token');
  } catch { /* ignore */ }
  if (!apiToken) return; // déconnecté : rien à rafraîchir
  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') return;
    const token = await registerForToken();
    // Même si le token n'a pas changé, l'appel rafraîchit last_used_at côté
    // backend (peu coûteux, permet de purger les tokens morts).
    await registerTokenWithBackend(token);
  } catch { /* best-effort */ }
}
