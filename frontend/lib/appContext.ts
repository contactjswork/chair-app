import { useSyncExternalStore } from 'react';

// Identité du binaire natif qui affiche le site.
//
// CHAIR CLIENT (app.getchair.client) et CHAIR PRO (app.getchair.pro) sont deux
// applications distinctes qui chargent le MÊME site distant via `server.url`
// (voir capacitor.chair.config.ts / capacitor.pro.config.ts). Conséquence :
// `window.Capacitor` est identique dans les deux, et l'URL de départ (/app vs
// /pro) n'est pas persistante — dès la première navigation interne, plus rien
// ne distingue les deux binaires.
//
// Le seul signal fiable et persistant est le User-Agent de la WebView, auquel
// chaque configuration Capacitor ajoute son propre marqueur
// (`ios.appendUserAgent` / `android.appendUserAgent`).
//
// ⚠️ CE MARQUEUR N'EXISTE QU'À PARTIR DU PROCHAIN BUILD.
// Il est injecté par le shell natif au lancement de la WebView : tout binaire
// déjà installé (TestFlight ou local) compilé AVANT l'ajout de
// `appendUserAgent` continuera d'envoyer un User-Agent sans marqueur, et sera
// donc détecté comme 'unknown' — indéfiniment, jusqu'à ce que l'utilisateur
// installe un build plus récent. Un simple rechargement du site ne suffit pas :
// il faut recompiler l'app (`npm run cap:chair:sync` puis un build Xcode /
// Codemagic). Tout appelant DOIT donc gérer 'unknown' explicitement.

/** Marqueur ajouté au User-Agent par capacitor.chair.config.ts. */
export const CLIENT_UA_MARKER = 'CHAIRClient';

/** Marqueur ajouté au User-Agent par capacitor.pro.config.ts. */
export const PRO_UA_MARKER = 'CHAIRPro';

export type AppContext =
  /** Binaire CHAIR CLIENT identifié (marqueur UA présent). */
  | 'client'
  /** Binaire CHAIR PRO identifié (marqueur UA présent). */
  | 'pro'
  /** Navigateur web classique — aucun shell natif Capacitor. */
  | 'web'
  /**
   * Indéterminé. Deux cas, volontairement confondus car ils appellent le même
   * traitement prudent :
   *   1. rendu serveur / avant hydratation — `navigator` n'existe pas encore ;
   *   2. shell natif Capacitor SANS marqueur — binaire antérieur à l'ajout de
   *      `appendUserAgent` (voir l'avertissement en tête de fichier).
   */
  | 'unknown';

/**
 * Volontairement PAS d'import depuis hooks/useGeolocation.ts, qui expose déjà
 * un `isNativeApp()` identique : ce module y importe `@capacitor/geolocation`,
 * ce qui embarquerait le plugin de géolocalisation dans le bundle de toute
 * page qui veut seulement connaître son contexte d'exécution. La duplication
 * (deux lignes) est ici moins coûteuse que la dépendance.
 */
function isCapacitorShell(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

function readUserAgent(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent || '';
}

/**
 * Contexte d'exécution courant. Sûr au rendu serveur : ne touche ni `window`
 * ni `navigator` sans garde, et renvoie 'unknown' tant qu'ils n'existent pas.
 *
 * Fonction pure d'un point de vue observable (le User-Agent ne change jamais
 * pendant la vie d'une page) — testable en injectant un User-Agent factice.
 */
export function getAppContext(): AppContext {
  if (typeof window === 'undefined') return 'unknown';

  const ua = readUserAgent();
  // Les deux marqueurs sont mutuellement exclusifs (un binaire n'embarque
  // qu'une configuration Capacitor), l'ordre de test n'a pas d'importance.
  if (ua.includes(PRO_UA_MARKER)) return 'pro';
  if (ua.includes(CLIENT_UA_MARKER)) return 'client';

  // Natif mais sans marqueur : binaire antérieur au marquage. On ne devine
  // PAS à partir de l'URL courante (/app vs /pro) : dans le binaire CLIENT,
  // un compte pro est redirigé vers /pro (voir app/app/layout.tsx), l'URL
  // dirait donc "pro" dans une app CLIENT — exactement le contresens à éviter.
  if (isCapacitorShell()) return 'unknown';

  return 'web';
}

/** Vrai uniquement si le marqueur CLIENT est présent. Jamais pour 'unknown'. */
export function isClientBinary(): boolean {
  return getAppContext() === 'client';
}

/** Vrai uniquement si le marqueur PRO est présent. Jamais pour 'unknown'. */
export function isProBinary(): boolean {
  return getAppContext() === 'pro';
}

/** Vrai dans un shell natif dont on ne sait pas s'il est CLIENT ou PRO. */
export function isUnidentifiedBinary(): boolean {
  return getAppContext() === 'unknown' && isCapacitorShell();
}

/**
 * Politique unique pour l'App Store Review Guideline 3.1.1(a) : hors
 * storefront américain (la France en fait partie), une app ne peut pas
 * présenter de bouton, de lien externe ou d'appel à l'action dirigeant vers
 * un moyen de paiement autre que l'achat intégré, POUR DU CONTENU NUMÉRIQUE.
 * CHAIR+ (stories, vidéos, badge, boost, analytics) est numérique et passe
 * par Stripe : son tarif et son bouton de souscription n'ont donc rien à
 * faire dans le binaire CHAIR CLIENT.
 *
 * À l'inverse, la prestation de coiffure est un service PHYSIQUE, exclu de
 * cette règle par 3.1.3(e) : la réservation ne doit surtout PAS passer par
 * l'achat intégré et n'est pas concernée par cette fonction.
 *
 * Renvoie false pour 'unknown' — choix délibéré, c'est le comportement le
 * plus sûr :
 *   • faux négatif (un pro sur un binaire PRO ancien, non marqué, ne voit pas
 *     le tarif dans l'app) : gênant mais sans perte — la page lui indique
 *     explicitement où gérer son abonnement, et le cas disparaît dès qu'il
 *     installe un build marqué ;
 *   • faux positif (un tarif d'abonnement numérique affiché dans le binaire
 *     CLIENT) : motif de rejet App Store.
 * Le coût des deux erreurs n'est pas symétrique, donc on tranche du côté
 * prudent. Cela vaut AUSSI pendant le rendu serveur et avant hydratation :
 * aucun tarif n'est jamais peint puis retiré.
 *
 * Ce n'est pas un contournement d'App Review : le comportement ne dépend que
 * du binaire, jamais de qui l'utilise. Un reviewer voit exactement ce que
 * voit n'importe quel utilisateur du même binaire.
 */
export function allowsDigitalSubscriptionUI(context: AppContext = getAppContext()): boolean {
  return context === 'pro' || context === 'web';
}

/**
 * Version React de `getAppContext()`, sûre à l'hydratation : la détection lit
 * `navigator`, indisponible au rendu serveur. `useSyncExternalStore` sert
 * exactement ce cas — le User-Agent est une source de vérité externe à React,
 * lue via un snapshot serveur ('unknown', non résolu) puis remplacée par le
 * snapshot client dès l'hydratation terminée, sans mismatch. Même mécanique
 * que useCookieBannerVisible dans components/ui/CookieBanner.tsx.
 *
 * `resolved` distingue "pas encore mesuré" de "mesuré, résultat indéterminé" —
 * un appelant qui affiche une UI de paiement doit montrer son état de
 * chargement tant que `resolved` est false plutôt que d'afficher puis retirer.
 * Les deux cas retombent de toute façon sur le comportement prudent
 * (`allowsDigitalSubscriptionUI('unknown') === false`).
 */
export interface AppContextSnapshot {
  context: AppContext;
  resolved: boolean;
}

const UNRESOLVED_SNAPSHOT: AppContextSnapshot = Object.freeze({ context: 'unknown', resolved: false });

// Le User-Agent ne change jamais pendant la vie d'une page : le snapshot est
// calculé une fois puis mémorisé. Indispensable, `useSyncExternalStore` exige
// un getSnapshot stable au sens de Object.is (sinon boucle de rendu).
let clientSnapshot: AppContextSnapshot | null = null;

function getClientSnapshot(): AppContextSnapshot {
  if (!clientSnapshot) {
    clientSnapshot = Object.freeze({ context: getAppContext(), resolved: true });
  }
  return clientSnapshot;
}

function getServerSnapshot(): AppContextSnapshot {
  return UNRESOLVED_SNAPSHOT;
}

// Rien à écouter : l'identité du binaire ne change pas en cours de session.
function subscribeToAppContext(): () => void {
  return () => {};
}

export function useAppContext(): AppContextSnapshot {
  return useSyncExternalStore(subscribeToAppContext, getClientSnapshot, getServerSnapshot);
}

/** Réservé aux tests : oublie le snapshot mémorisé. */
export function resetAppContextCache(): void {
  clientSnapshot = null;
}
