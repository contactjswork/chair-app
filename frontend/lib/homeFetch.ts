// La home ne doit jamais rester vide — l'app est jeune, la couverture par
// ville est encore partielle. Chaque section essaie d'abord un rayon serré
// autour de la ville réelle de l'utilisateur, puis élargit progressivement,
// puis abandonne la contrainte géographique (jamais la contrainte de
// spécialité/genre, elle, qui reste absolue) avant de renoncer.

import type { ApiHairdresserProfile, PaginatedResponse } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export interface SimpleGeo { lat: number; lng: number }

async function fetchHairdressers(params: URLSearchParams): Promise<ApiHairdresserProfile[]> {
  try {
    const res = await fetch(`${API}/hairdressers?${params}`);
    if (!res.ok) return [];
    const data: PaginatedResponse<ApiHairdresserProfile> = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Coups de cœur RÉELS (sort=chair_pick, sélection admin) — pas de filtre
 * spécialité ni de repli générique : s'il n'y a aucun pick actif, la liste
 * est vide et la section se cache. La géo ne sert qu'à ordonner les picks
 * par proximité côté backend.
 */
export async function fetchChairPicks(geo: SimpleGeo | null, perPage: number): Promise<ApiHairdresserProfile[]> {
  const params = new URLSearchParams({ sort: 'chair_pick', per_page: String(perPage) });
  if (geo) {
    params.set('lat', String(geo.lat));
    params.set('lng', String(geo.lng));
  }
  // Re-filtre côté client : un backend pas encore déployé ignore
  // sort=chair_pick et renvoie le listing générique — sans ce filtre, des
  // profils quelconques s'afficheraient sous « Coup de cœur CHAIR ».
  return (await fetchHairdressers(params)).filter((h) => h.is_chair_pick);
}

/**
 * Essaie un rayon serré, puis élargit, puis retire la contrainte géo — la
 * spécialité (déjà pure côté genre) reste appliquée à chaque tentative.
 */
export async function fetchHairdressersProgressive(
  slugs: string[],
  geo: SimpleGeo | null,
  perPage: number,
  extra: Record<string, string> = {}
): Promise<{ results: ApiHairdresserProfile[]; isGeo: boolean }> {
  const radii = geo ? [30, 100] : [];

  for (const radius of radii) {
    const params = new URLSearchParams({ per_page: String(perPage), lat: String(geo!.lat), lng: String(geo!.lng), radius: String(radius), ...extra });
    slugs.forEach((s) => params.append('specialty[]', s));
    const results = await fetchHairdressers(params);
    if (results.length) return { results, isGeo: true };
  }

  // National, toujours filtré par spécialité — mieux qu'une section vide.
  const params = new URLSearchParams({ per_page: String(perPage), ...extra });
  slugs.forEach((s) => params.append('specialty[]', s));
  const results = await fetchHairdressers(params);
  return { results, isGeo: false };
}
