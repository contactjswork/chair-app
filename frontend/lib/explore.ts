// Moteur de découverte de la page Recherche client — client API /explore,
// types unifiés salon/indépendant, recherches récentes, cache court.

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Types ────────────────────────────────────────────────────────────────────

export type ExploreResultType = 'salon' | 'hairdresser';

export interface ExploreMatchedPro {
  name: string;
  slug: string;
  avatar: string | null;
}

export interface ExploreSalonRef {
  name: string;
  slug: string;
}

export interface ExploreResult {
  type: ExploreResultType;
  id: number;
  slug: string;
  name: string;
  image: string | null;
  avatar: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  has_coords: boolean;
  distance_km: number | null;
  avg_rating: number;
  reviews_count: number;
  is_verified: boolean;
  /** Badge Certifié CHAIR (abonné CHAIR+) — absent/false pour les salons. */
  is_chair_plus?: boolean;
  /** "Coup de cœur CHAIR" — sélection éditoriale, indépendante de l'abonnement. */
  is_chair_pick?: boolean;
  /** Uniquement pour type='hairdresser' — un salarié en salon est `false` */
  is_independent: boolean;
  /** Salon d'affiliation d'un coiffeur salarié — contexte, jamais son identité */
  salon: ExploreSalonRef | null;
  specialties: { name: string; slug: string }[];
  price_from: number | null;
  team_count: number | null;
  matched_pros: ExploreMatchedPro[];
  chair_level?: { level: number; name: string; color: string } | null;
  tagline: string | null;
}

export interface ExploreCounts {
  all: number;
  salons: number;
  hairdressers: number;
}

export interface ExploreResponse {
  data: ExploreResult[];
  total: number;
  counts: ExploreCounts;
  per_page: number;
  current_page: number;
}

export interface ExploreBbox {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
}

export type ExploreSort = 'relevance' | 'distance' | 'rating' | 'popular';
export type ExploreType = 'all' | 'salon' | 'hairdresser';

export interface ExploreParams {
  q?: string;
  specialty?: string[];
  lat?: number;
  lng?: number;
  radius?: number;
  bbox?: ExploreBbox | null;
  min_rating?: number;
  type?: ExploreType;
  sort?: ExploreSort;
  interests?: string[];
  page?: number;
  per_page?: number;
}

/** Clé unique d'un résultat (les ids salon et coiffeur peuvent se chevaucher). */
export function resultKey(r: Pick<ExploreResult, 'type' | 'id'>): string {
  return `${r.type}-${r.id}`;
}

export function resultHref(r: Pick<ExploreResult, 'type' | 'slug'>): string {
  return r.type === 'salon' ? `/app/salon/${r.slug}` : `/app/coiffeur/${r.slug}`;
}

// ── Client API ───────────────────────────────────────────────────────────────

function buildQuery(params: ExploreParams): string {
  const qs = new URLSearchParams();
  if (params.q?.trim())                 qs.set('q', params.q.trim());
  if (params.specialty?.length)         qs.set('specialty', params.specialty.join(','));
  if (params.bbox) {
    qs.set('sw_lat', String(params.bbox.sw_lat));
    qs.set('sw_lng', String(params.bbox.sw_lng));
    qs.set('ne_lat', String(params.bbox.ne_lat));
    qs.set('ne_lng', String(params.bbox.ne_lng));
  } else if (params.lat != null && params.lng != null) {
    qs.set('lat', String(params.lat));
    qs.set('lng', String(params.lng));
    if (params.radius != null) qs.set('radius', String(params.radius));
  }
  if (params.min_rating)                qs.set('min_rating', String(params.min_rating));
  if (params.type && params.type !== 'all') qs.set('type', params.type);
  if (params.sort)                      qs.set('sort', params.sort);
  if (params.interests?.length)         qs.set('interests', params.interests.join(','));
  if (params.page)                      qs.set('page', String(params.page));
  if (params.per_page)                  qs.set('per_page', String(params.per_page));
  return qs.toString();
}

// Cache court en mémoire — évite de re-requêter à l'identique quand l'utilisateur
// bascule entre carte et liste ou rouvre les filtres sans rien changer.
const CACHE_TTL = 45_000;
const cache = new Map<string, { at: number; res: ExploreResponse }>();

export async function fetchExplore(params: ExploreParams, signal?: AbortSignal): Promise<ExploreResponse> {
  const key = buildQuery(params);

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.res;

  const res = await fetch(`${API}/explore?${key}`, { signal, headers: { Accept: 'application/json' } });

  if (res.status === 404) {
    // Backend pas encore déployé avec /explore — composition depuis les
    // endpoints historiques (indépendants seulement sur la carte).
    const legacy = await fetchExploreLegacy(params, signal);
    cache.set(key, { at: Date.now(), res: legacy });
    return legacy;
  }

  if (!res.ok) throw new Error(`Erreur ${res.status}`);

  const data = (await res.json()) as ExploreResponse;
  cache.set(key, { at: Date.now(), res: data });
  return data;
}

// ── Fallback endpoints historiques ───────────────────────────────────────────

interface LegacyHairdresser {
  id: number;
  slug: string;
  city: string | null;
  banner_image: string | null;
  tagline: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  distance_km?: number;
  avg_rating: string;
  reviews_count: number;
  is_verified: boolean;
  is_independent: boolean | null;
  salon_id?: number | null;
  salon?: { name: string; slug: string } | null;
  work_address?: string | null;
  user: { name: string; avatar: string | null };
  specialties: { name: string; slug: string }[];
  chair_level?: { level: number; name: string; color: string } | null;
}

async function fetchExploreLegacy(params: ExploreParams, signal?: AbortSignal): Promise<ExploreResponse> {
  const qs = new URLSearchParams();
  if (params.q?.trim())            qs.set('q', params.q.trim());
  if (params.specialty?.length)    qs.set('specialty', params.specialty[0]);
  if (params.min_rating)           qs.set('min_rating', String(params.min_rating));
  if (params.lat != null && params.lng != null && params.radius != null) {
    qs.set('lat', String(params.lat));
    qs.set('lng', String(params.lng));
    qs.set('radius', String(params.radius));
  }
  qs.set('per_page', '50');

  const res = await fetch(`${API}/search?${qs}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  const payload = (await res.json()) as { data: LegacyHairdresser[]; total: number };

  // Chaque coiffeur — salarié ou indépendant — a sa propre fiche, exactement
  // comme /explore : le fallback ne doit pas re-créer le biais "salarié caché".
  const results: ExploreResult[] = payload.data.map((h) => {
    const lat = h.latitude != null ? parseFloat(String(h.latitude)) : null;
    const lng = h.longitude != null ? parseFloat(String(h.longitude)) : null;
    const hasCoords = lat != null && !isNaN(lat) && lng != null && !isNaN(lng);
    return {
      type: 'hairdresser' as const,
      id: h.id,
      slug: h.slug,
      name: h.user.name,
      image: h.banner_image ?? h.user.avatar,
      avatar: h.user.avatar,
      city: h.city,
      address: h.work_address ?? null,
      latitude: hasCoords ? lat : null,
      longitude: hasCoords ? lng : null,
      has_coords: hasCoords,
      distance_km: h.distance_km ?? null,
      avg_rating: Math.round(parseFloat(h.avg_rating) * 10) / 10 || 0,
      reviews_count: h.reviews_count,
      is_verified: h.is_verified,
      is_independent: !(h.is_independent === false && h.salon_id != null),
      salon: h.salon ?? null,
      specialties: h.specialties.map((s) => ({ name: s.name, slug: s.slug })),
      price_from: null,
      team_count: null,
      matched_pros: [],
      chair_level: h.chair_level ?? null,
      tagline: h.tagline,
    };
  });

  const filtered = params.type === 'salon' ? [] : results;

  return {
    data: filtered,
    total: filtered.length,
    counts: { all: results.length, salons: 0, hairdressers: results.length },
    per_page: 50,
    current_page: 1,
  };
}

// ── Géocodage ville ──────────────────────────────────────────────────────────

export interface GeocodeResult {
  city: string;
  lat: number;
  lng: number;
}

export async function geocodeCity(q: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const res = await fetch(`${API}/geocode?q=${encodeURIComponent(q.trim())}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.lat == null) return null;
  return { city: data.city, lat: data.lat, lng: data.lng };
}

// ── Recherches récentes ──────────────────────────────────────────────────────

export type RecentSearchType = 'query' | 'specialty' | 'city' | 'hairdresser' | 'salon' | 'service';

export interface RecentSearch {
  type: RecentSearchType;
  label: string;
  value: string;
  slug?: string;
}

const RECENT_KEY = 'chair_recent_searches_v2';
const RECENT_MAX = 8;

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((r) => r && r.label && r.type) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(item: RecentSearch): void {
  if (!item.label.trim() || item.label.trim().length < 2) return;
  const prev = getRecentSearches().filter((r) => !(r.type === item.type && r.value === item.value));
  localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...prev].slice(0, RECENT_MAX)));
}

export function removeRecentSearch(item: RecentSearch): void {
  const prev = getRecentSearches().filter((r) => !(r.type === item.type && r.value === item.value));
  localStorage.setItem(RECENT_KEY, JSON.stringify(prev));
}

export function clearRecentSearches(): void {
  localStorage.removeItem(RECENT_KEY);
}

// ── Préférences client (questionnaire onboarding) ────────────────────────────

export interface ClientPrefs {
  gender?: 'homme' | 'femme' | null;
  interests?: string[];
}

export function getClientPrefs(): ClientPrefs {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('chair_preferences') ?? '{}');
  } catch {
    return {};
  }
}

// ── Spécialités CHAIR ────────────────────────────────────────────────────────

export const SPECIALTY_LABELS: Record<string, string> = {
  'coupe-homme':          'Coupe Homme',
  'barbe':                'Barbe',
  'coupe-femme':          'Coupe Femme',
  'couleur-balayage':     'Couleur & Balayage',
  'texture-lissage':      'Texture & Lissage',
  'boucles-curly':        'Boucles & Curly',
  'afro-locks':           'Afro & Locks',
  'extensions':           'Extensions',
  'evenementiel':         'Événementiel',
  'soins-transformation': 'Soins & Transformation',
};

/** Ordonne les spécialités selon les préférences du client — sans jamais en cacher. */
export function orderSpecialties(slugs: string[], prefs: ClientPrefs): string[] {
  const interests = prefs.interests ?? [];
  const genderFirst =
    prefs.gender === 'homme' ? ['coupe-homme', 'barbe', 'afro-locks'] :
    prefs.gender === 'femme' ? ['couleur-balayage', 'coupe-femme', 'boucles-curly'] : [];

  const rank = (slug: string): number => {
    const i = interests.indexOf(slug);
    if (i >= 0) return i;
    const g = genderFirst.indexOf(slug);
    if (g >= 0) return 100 + g;
    return 1000 + slugs.indexOf(slug);
  };

  return [...slugs].sort((a, b) => rank(a) - rank(b));
}
