// Contrat partagé du moteur de recommandation backend (voir
// backend/app/Services/RecommendationService.php) — consommé à la fois par
// la page Recherche (GET /api/explore, champ `fallback` de la réponse) et
// par la Home (GET /api/recommendations). UN SEUL moteur de scoring des deux
// côtés : ces types décrivent la même donnée quel que soit l'endpoint.

/**
 * Palier de repli géographique atteint. Mêmes valeurs des deux côtés,
 * mêmes seuils (voir RecommendationService::RADIUS_TIERS côté backend) :
 *   radius_10  → 10km   "Près de chez vous"
 *   radius_25  → 25km   "Dans votre secteur"
 *   radius_50  → 50km   "Autour de chez vous"
 *   radius_100 → 100km  "Plus loin de vous"
 *   region     → 250km  "Dans votre région"      (approximation, pas un
 *                         découpage administratif réel)
 *   national   → illimité "Partout en France"
 *   no_geo     → aucune position connue (jamais un repli géo inventé)
 *   empty      → aucun profil géolocalisé du tout dans la base
 */
export type RecommendationTier =
  | 'radius_10' | 'radius_25' | 'radius_50' | 'radius_100'
  | 'region' | 'national' | 'no_geo' | 'empty';

/**
 * Métadonnée de repli honnête — TOUJOURS afficher fallback_label quand
 * is_fallback est true plutôt que de laisser croire à de la proximité
 * ("Plus loin de vous" / "Dans votre région" / "Partout en France").
 * is_fallback est false uniquement pour tier === 'radius_10' (palier le
 * plus proche atteint dès le premier essai) ou 'no_geo' (rien à propos
 * de quoi "replier" puisqu'aucune position n'est connue).
 */
export interface RecommendationFallback {
  tier: RecommendationTier;
  is_fallback: boolean;
  /** null quand is_fallback est false — rien à afficher dans ce cas. */
  fallback_label: string | null;
  /** Rayon en km du palier atteint ; null pour no_geo/national/empty. */
  radius_km: number | null;
}

/** D'où viennent les spécialités utilisées pour scorer — pour debug/analytics, pas pour l'UI. */
export type RecommendationPrefSource =
  | 'explicit'               // recherche active / filtre choisi sur l'écran
  | 'user_preferences'       // interests[] serveur (onboarding, compte connecté)
  | 'user_preferences_gender'// profile_type serveur seul, pas d'interests explicites
  | 'client_relay'           // localStorage transmis en query par le frontend
  | 'none';                  // aucune préférence connue nulle part

/** Réponse de GET /api/recommendations (Home). */
export interface RecommendationMeta extends RecommendationFallback {
  pref_source: RecommendationPrefSource;
  /** true si un filtre spécialité était demandé mais a dû être abandonné
   *  faute de résultat exact dans la base (jamais dans le rayon, jamais un
   *  vrai match) — le caller doit alors présenter les résultats comme
   *  "les mieux notés autour de vous", pas comme un vrai match spécialité. */
  specialty_filter_relaxed: boolean;
}

export interface RecommendationSalonRef {
  name: string;
  slug: string;
}

/**
 * Un résultat de GET /api/recommendations — volontairement un sous-ensemble
 * compatible du contrat ExploreResult (voir frontend/lib/explore.ts) pour
 * qu'un composant de carte résultat unique puisse afficher les deux sans
 * conversion. Toujours type='hairdresser' ici (la home ne recommande jamais
 * de salon, seulement des fiches coiffeur individuelles).
 */
export interface RecommendationResult {
  type: 'hairdresser';
  id: number;
  slug: string;
  name: string;
  image: string | null;
  avatar: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  has_coords: boolean;
  /** null si aucune position utilisateur connue (tier='no_geo'). */
  distance_km: number | null;
  avg_rating: number;
  reviews_count: number;
  is_verified: boolean;
  is_chair_plus?: boolean;
  is_chair_pick?: boolean;
  salon: RecommendationSalonRef | null;
  specialties: { name: string; slug: string }[];
  chair_level?: { level: number; name: string; color: string } | null;
  tagline: string | null;
  /** Score interne de classement — utile pour debug, jamais affiché tel quel à l'utilisateur. */
  match_score: number;
}

export interface RecommendationResponse {
  data: RecommendationResult[];
  total: number;
  meta: RecommendationMeta;
}

export interface RecommendationParams {
  specialty?: string[];
  /** Relais localStorage (getUserSpecialtySlugs() côté visiteur/compte pas encore synchro) — voir homeFilters.ts. */
  interests?: string[];
  lat?: number;
  lng?: number;
  min_rating?: number;
  per_page?: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

/**
 * Client GET /api/recommendations. Auth optionnelle : si l'utilisateur est
 * connecté (token présent), le backend personnalise automatiquement via
 * user_preferences serveur + géo du compte — inutile de renvoyer `interests`
 * dans ce cas (mais sans danger si transmis quand même, la priorité est
 * gérée côté backend : explicite > user_preferences > relais > rien).
 */
export async function fetchRecommendations(
  params: RecommendationParams,
  token?: string | null,
  signal?: AbortSignal
): Promise<RecommendationResponse> {
  const qs = new URLSearchParams();
  if (params.specialty?.length) qs.set('specialty', params.specialty.join(','));
  if (params.interests?.length) qs.set('interests', params.interests.join(','));
  if (params.lat != null && params.lng != null) {
    qs.set('lat', String(params.lat));
    qs.set('lng', String(params.lng));
  }
  if (params.min_rating) qs.set('min_rating', String(params.min_rating));
  if (params.per_page) qs.set('per_page', String(params.per_page));

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}/recommendations?${qs}`, { signal, headers });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json();
}
