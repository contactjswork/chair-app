// ── Reprise de parcours de réservation ──────────────────────────────────────
// Quand un visiteur non connecté arrive au bout du parcours BookingSheet
// (prestation + date + créneau choisis) et doit créer un compte / se
// connecter, tout son parcours partait à la poubelle : après l'auth il
// revenait sur la fiche coiffeur vierge. On persiste donc son "intention de
// réservation" en sessionStorage juste avant de l'envoyer vers /connexion ou
// /inscription, et la fiche coiffeur la reprend au retour en rouvrant la
// feuille de réservation pré-remplie.
//
// sessionStorage (et pas localStorage) est un choix délibéré :
// - survit aux navigations internes ET au refresh de la page de connexion
//   (2e tentative après un mot de passe erroné, par exemple) ;
// - meurt avec l'onglet — un intent ne ressuscite jamais des jours plus tard
//   sur un autre parcours. L'expiration ci-dessous couvre le cas de l'onglet
//   laissé ouvert longtemps.

export interface BookingIntent {
  hairdresserSlug: string;
  serviceId: number;
  categoryId?: number;
  /** Format YYYY-MM-DD — vide si l'utilisateur n'avait pas encore choisi. */
  date?: string;
  /** Format HH:MM — vide si l'utilisateur n'avait pas encore choisi. */
  time?: string;
  /** D'où venait l'interruption (debug/analytics). */
  source: 'booking_sheet';
  createdAt: number;
}

const STORAGE_KEY = 'chair_booking_intent';
/** Au-delà, l'intent est considéré périmé : le créneau a toutes les chances
 *  d'être parti, et rejouer un vieux parcours serait plus déroutant qu'utile. */
const MAX_AGE_MS = 60 * 60 * 1000; // 60 min

export function saveBookingIntent(intent: Omit<BookingIntent, 'createdAt' | 'source'>): void {
  if (typeof window === 'undefined') return;
  try {
    const full: BookingIntent = { ...intent, source: 'booking_sheet', createdAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // Stockage plein / bloqué (mode privé strict) : tant pis, le parcours
    // repartira de la fiche coiffeur — jamais d'erreur visible pour ça.
  }
}

/**
 * Lit l'intent courant s'il est encore frais et (optionnellement) s'il
 * concerne bien ce coiffeur. Un intent périmé est nettoyé au passage.
 * Ne consomme PAS l'intent — appeler clearBookingIntent() une fois repris.
 */
export function readBookingIntent(forSlug?: string): BookingIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw) as BookingIntent;
    if (
      typeof intent?.hairdresserSlug !== 'string' ||
      typeof intent?.serviceId !== 'number' ||
      typeof intent?.createdAt !== 'number'
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - intent.createdAt > MAX_AGE_MS) {
      // Abandon silencieux : l'utilisateur est parti trop longtemps.
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (forSlug && intent.hairdresserSlug !== forSlug) return null;
    return intent;
  } catch {
    return null;
  }
}

/** À appeler dès que l'intent est repris (feuille rouverte) — il ne doit
 *  jamais se rejouer une seconde fois. */
export function clearBookingIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // rien à faire
  }
}
