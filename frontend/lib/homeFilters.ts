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
export const HOMME_SLUGS = ['coupe-homme', 'barbe', 'afro-locks', 'texture-lissage', 'couleur-balayage', 'extensions'];
export const DEFAULT_SLUGS = ['couleur-balayage', 'coupe-homme', 'boucles-curly', 'afro-locks', 'evenementiel', 'texture-lissage', 'coupe-femme', 'extensions'];

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
