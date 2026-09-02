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

/** Marqueur ajouté au User-Agent par capacitor.business.config.ts. */
export const BUSINESS_UA_MARKER = 'CHAIRBusiness';

export type AppContext =
  /** Binaire CHAIR CLIENT identifié (marqueur UA présent). */
  | 'client'
  /** Binaire CHAIR PRO identifié (marqueur UA présent). */
  | 'pro'
  /** Binaire CHAIR BUSINESS (gérants de salon) identifié. */
  | 'business'
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
  // Les marqueurs sont mutuellement exclusifs (un binaire n'embarque qu'une
  // configuration Capacitor). BUSINESS testé avant PRO par prudence : aucun
  // marqueur n'est un préfixe d'un autre aujourd'hui, gardons ça vrai.
  if (ua.includes(BUSINESS_UA_MARKER)) return 'business';
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

/** Vrai uniquement si le marqueur BUSINESS est présent. Jamais pour 'unknown'. */
export function isBusinessBinary(): boolean {
  return getAppContext() === 'business';
}

/** Vrai dans un shell natif dont on ne sait pas s'il est CLIENT ou PRO. */
export function isUnidentifiedBinary(): boolean {
  return getAppContext() === 'unknown' && isCapacitorShell();
}

// ─────────────────────────────────────────────────────────────────────────
// Verrou binaire ↔ rôle de compte (retour Julien 01/09/2026 : « un compte
// CHAIR PRO peut QUE se connecter sur CHAIR PRO l'app, et pareil pour
// l'inverse »). Deux apps distinctes sur l'App Store = deux mondes étanches :
// un compte pro dans le binaire CLIENT affichait l'interface PRO complète
// dans l'app grand public — exactement ce que la séparation en deux apps
// devait empêcher.
//
// Le verrou ne s'applique QUE lorsque le binaire est identifié ('client' ou
// 'pro') : sur le web les deux espaces cohabitent volontairement, et un
// binaire 'unknown' (antérieur au marqueur UA) ne doit jamais déconnecter
// quelqu'un sur un soupçon — le verrou s'activera de lui-même dès que
// l'utilisateur installera un build marqué.
//
// Le rôle 'admin' passe partout : compte interne des fondateurs, le bloquer
// sur mobile ne protégerait rien et pourrait les enfermer dehors.
// ─────────────────────────────────────────────────────────────────────────

/** Clé sessionStorage du message affiché sur l'écran de connexion après une
 *  éviction (session existante refusée par le verrou au démarrage). */
export const WRONG_APP_MSG_KEY = 'chair_wrong_app_msg';

export type BinaryLockVerdict =
  | { allowed: true }
  | {
      /** Refusé : ce rôle de compte n'a pas sa place dans ce binaire. */
      allowed: false;
      /** Message utilisateur — dit QUELLE app utiliser, pas juste « non ». */
      message: string;
      /** Écran de connexion du binaire courant (où renvoyer l'évincé). */
      loginPath: string;
    };

/**
 * Identité minimale nécessaire au verdict. `can_manage_salon` porte la double
 * casquette (un coiffeur peut posséder un salon sans avoir le rôle
 * salon_owner, et inversement) — absent (undefined) = on ne sait pas, on
 * reste permissif plutôt que d'évincer à tort.
 */
export interface LockSubject {
  role: string;
  can_manage_salon?: boolean;
}

/**
 * Le compte a-t-il le droit de vivre dans le binaire courant ?
 * À appeler à CHAQUE point d'entrée d'une session : connexion, inscription,
 * et restauration d'une session stockée au démarrage.
 *
 * Répartition à TROIS apps (décision Julien 02/09/2026, « les deux apps »
 * pour la double casquette) :
 *   CHAIR (client)   → comptes clients uniquement ;
 *   CHAIR PRO        → coiffeurs ET gérants (le mode gérant y reste tant que
 *                      CHAIR BUSINESS n'est pas publiée — resserrer ensuite) ;
 *   CHAIR BUSINESS   → uniquement les comptes qui gèrent un salon.
 */
export function binaryLockVerdict(subject: LockSubject, context: AppContext = getAppContext()): BinaryLockVerdict {
  const { role, can_manage_salon } = subject;
  const isProRole = role === 'hairdresser' || role === 'salon_owner';

  if (context === 'client' && isProRole) {
    return {
      allowed: false,
      message: 'Ce compte est un compte professionnel. CHAIR est l’app réservée aux clients — connecte-toi depuis l’app CHAIR PRO.',
      loginPath: '/connexion',
    };
  }
  if (context === 'pro' && role === 'client') {
    return {
      allowed: false,
      message: 'Ce compte est un compte client. CHAIR PRO est l’app réservée aux professionnels — connectez-vous depuis l’app CHAIR.',
      loginPath: '/pro/connexion',
    };
  }

  if (context === 'business') {
    if (role === 'client') {
      return {
        allowed: false,
        message: 'Ce compte est un compte client. CHAIR BUSINESS est l’app des gérants de salon — utilisez l’app CHAIR.',
        loginPath: '/pro/connexion',
      };
    }
    // Coiffeur sans salon : son espace est CHAIR PRO. On ne refuse que si on
    // SAIT qu'il ne gère aucun salon (false explicite) — pas de casquette
    // connue (undefined) = prudence, on laisse entrer. Un salon_owner passe
    // toujours (le rôle même vaut casquette, ex. inscription fraîche).
    if (role === 'hairdresser' && can_manage_salon === false) {
      return {
        allowed: false,
        message: 'CHAIR BUSINESS est réservée aux gérants de salon. Ton espace coiffeur est dans l’app CHAIR PRO.',
        loginPath: '/pro/connexion',
      };
    }
  }

  return { allowed: true };
}

/**
 * Politique unique pour l'App Store Review Guideline 3.1.1(a) : hors
 * storefront américain (la France en fait partie), une app ne peut pas
 * présenter de bouton, de lien externe ou d'appel à l'action dirigeant vers
 * un moyen de paiement autre que l'achat intégré, POUR DU CONTENU NUMÉRIQUE.
 * CHAIR+ (stories, vidéos, badge, boost, analytics) est numérique : sur le
 * web il passe par Stripe, et dans le binaire PRO par l'achat intégré Apple
 * (lib/iap.ts) — conforme dans les deux cas. Dans le binaire CHAIR CLIENT en
 * revanche, ni tarif ni bouton de souscription : ce n'est pas son monde.
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
  // 'business' : même statut que 'pro' — binaire professionnel où l'achat
  // passe par la feuille Apple (CHAIR BUSINESS y est vendu en achat intégré).
  return context === 'pro' || context === 'business' || context === 'web';
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
