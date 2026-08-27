// Filtrage "vraiment personnalisé" de la home client : chaque section doit
// respecter les DEUX mêmes règles — (1) uniquement les spécialités choisies
// par l'utilisateur (déjà "pures" côté genre, voir STYLES_FEMME/STYLES_HOMME
// dans compte/modifier et l'onboarding — un slug 'femme' n'apparaît jamais
// dans la liste d'un utilisateur 'homme'), (2) uniquement autour de sa VILLE
// réelle (user.latitude/longitude, géocodée côté backend), jamais le GPS
// appareil qui n'a aucun rapport avec "chez lui".

import type { AuthUser } from './auth';

export interface UserPrefs {
  gender: 'femme' | 'homme' | 'non-binaire' | null;
  interests: string[];
}

// Catégories de repli par genre — mêmes listes que HomeGeoStrips utilisait
// déjà pour les visiteurs sans intérêts précis explicitement sélectionnés.
export const FEMME_SLUGS = ['couleur-balayage', 'coupe-femme', 'boucles-curly', 'texture-lissage', 'evenementiel', 'extensions'];
// « Couleur & Balayage » et « Extensions » retirés du repli homme : proposer
// un balayage à quelqu'un qui a simplement dit « homme » et rien de plus est
// exactement le genre de suggestion qui décrédibilise la personnalisation
// (retour de Julien). Ces catégories restent atteignables — par « Voir tout »,
// et si l'utilisateur les choisit explicitement à l'onboarding, ses choix
// priment toujours sur ce repli.
export const HOMME_SLUGS = ['coupe-homme', 'barbe', 'afro-locks', 'texture-lissage', 'boucles-curly', 'soins-transformation'];
export const DEFAULT_SLUGS = ['couleur-balayage', 'coupe-homme', 'boucles-curly', 'afro-locks', 'evenementiel', 'texture-lissage', 'coupe-femme', 'extensions'];

/**
 * Rapatrie les préférences depuis le serveur quand cet appareil n'en a aucune.
 *
 * L'onboarding les enregistre des deux côtés — localStorage ET
 * POST /preferences — mais RIEN ne relisait jamais le serveur. Conséquence :
 * après une réinstallation ou sur un second appareil, les choix de
 * l'utilisateur étaient perdus et la home repartait sur le repli générique,
 * qui commence par « Couleur & Balayage ». Un homme ayant pourtant répondu à
 * l'onboarding se retrouvait avec du balayage en première position.
 *
 * Silencieuse et non bloquante : un 404 signifie simplement que rien n'a
 * jamais été renseigné, ce qui n'est pas une erreur. N'écrase jamais des
 * préférences déjà présentes sur l'appareil — elles sont forcément au moins
 * aussi récentes.
 */
export async function hydrateUserPrefsFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem('chair_preferences')) return;

    const token = localStorage.getItem('chair_token');
    if (!token) return;

    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
    const res = await fetch(`${base}/preferences`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) return;

    const pref = (await res.json()) as { profile_type?: string | null; interests?: unknown };
    const gender = (pref?.profile_type ?? null) as UserPrefs['gender'];
    const interests = Array.isArray(pref?.interests) ? (pref.interests as string[]) : [];
    if (!gender && interests.length === 0) return;

    localStorage.setItem('chair_preferences', JSON.stringify({ gender, interests }));
  } catch {
    /* best-effort : la home fonctionne sans, avec le repli générique */
  }
}

export function getUserPrefs(): UserPrefs {
  if (typeof window === 'undefined') return { gender: null, interests: [] };
  try {
    const raw = localStorage.getItem('chair_preferences');
    if (!raw) return { gender: null, interests: [] };
    const prefs = JSON.parse(raw) as { gender?: UserPrefs['gender']; interests?: string[] };
    return { gender: prefs.gender ?? null, interests: prefs.interests ?? [] };
  } catch {
    return { gender: null, interests: [] };
  }
}

/** Spécialités à utiliser pour filtrer une section — jamais mélangées entre genres. */
export function getUserSpecialtySlugs(): string[] {
  const { gender, interests } = getUserPrefs();
  if (interests.length > 0) return interests;
  if (gender === 'femme') return FEMME_SLUGS;
  if (gender === 'homme') return HOMME_SLUGS;
  return DEFAULT_SLUGS;
}

/** true seulement si l'utilisateur a réellement choisi ses intérêts (pas le repli générique). */
export function hasExplicitInterests(): boolean {
  return getUserPrefs().interests.length > 0;
}

export interface UserGeo { lat: number; lng: number; city: string | null }

/**
 * Position réelle de l'utilisateur — sa ville de profil, jamais le GPS appareil.
 *
 * Les coordonnées sont converties explicitement en nombres. `users.latitude`
 * et `users.longitude` sont des colonnes DECIMAL : sans cast côté modèle,
 * Laravel les sérialise en CHAÎNES ("48.5734000"). Passées telles quelles à
 * Apple Plans, elles font lever MapKit — « `latitude` is not a number » — et
 * la page Recherche plantait pour tout utilisateur connecté ayant une ville.
 * Le modèle User est corrigé, mais on ne fait pas confiance à la forme d'une
 * donnée qui arrive du réseau.
 */
export function getUserGeo(user: AuthUser | null | undefined): UserGeo | null {
  if (!user || user.latitude == null || user.longitude == null) return null;
  const lat = Number(user.latitude);
  const lng = Number(user.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, city: user.city ?? null };
}

// Paliers de rayon du classement local (primaire, puis élargi "régional"
// avant le dernier recours France entière) — désormais pilotables sans build
// par le Super Admin (app_settings 'ranking_radius_tiers_km'). Voir
// lib/appConfig.ts::getRankingRadiusTiers() (source de vérité + repli), qui a
// remplacé l'ancienne constante RADIUS_TIERS figée ici. Voir
// HomeRankingSection / /app/classements pour les appelants.
