// Config applicative dynamique (Super Admin, voir backend AppConfigController
// GET /api/app-config). Contrat dur repris ici : cette lib NE DOIT JAMAIS
// faire planter l'app ni bloquer un rendu — toute panne réseau/format
// retombe silencieusement sur les DEFAULT_* ci-dessous, qui sont l'exact
// miroir des valeurs par défaut backend (voir backend/app/Services/
// HomeSectionsConfig.php et AppConfigController::defaults()).

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export type HomeSectionKey =
  | 'home_personalized'
  | 'specialty_quick_links'
  | 'coup_de_coeur'
  | 'ranking'
  | 'nearby_map'
  | 'realisations'
  | 'new_talents';

export interface HomeSectionConfig {
  key: HomeSectionKey;
  enabled: boolean;
  order: number;
  title: string | null;
  limit: number | null;
}

export interface RankingRadiusTier {
  km: number;
  label: string;
}

interface AppConfigShape {
  recherche?: { ranking_radius_tiers_km?: unknown; [k: string]: unknown };
  home?: { home_sections?: unknown; [k: string]: unknown };
  [group: string]: unknown;
}

// Même ordre/état/titres/limites que la home codée en dur historiquement —
// jamais désactivé/réordonné par erreur si la config admin est absente.
export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  { key: 'home_personalized',    enabled: true, order: 1, title: null,                             limit: 12 },
  { key: 'specialty_quick_links', enabled: true, order: 2, title: null,                             limit: 6 },
  { key: 'coup_de_coeur',        enabled: true, order: 3, title: 'Coup de cœur CHAIR',              limit: 10 },
  { key: 'ranking',              enabled: true, order: 4, title: 'Les meilleurs coiffeurs CHAIR',   limit: 5 },
  { key: 'nearby_map',           enabled: true, order: 5, title: 'Sur la carte',                    limit: 20 },
  { key: 'realisations',         enabled: true, order: 6, title: 'Réalisations du moment',          limit: 9 },
  { key: 'new_talents',          enabled: true, order: 7, title: 'Nouveaux talents',                limit: 8 },
];

const HOME_SECTION_KEYS: HomeSectionKey[] = DEFAULT_HOME_SECTIONS.map((s) => s.key);

export const DEFAULT_RANKING_RADIUS_TIERS: RankingRadiusTier[] = [
  { km: 50, label: 'près de chez vous' },
  { km: 200, label: 'dans votre région' },
];

// Cache mémoire très court — évite un fetch /api/app-config par section de
// home (7 composants) sur le même chargement de page, sans jamais mentir
// plus de quelques secondes après un changement admin (voir backend, même
// contrat : le cache réel/source de vérité vit côté API, ceci n'est qu'une
// déduplication de requêtes réseau côté client/serveur Next).
let inFlight: Promise<AppConfigShape> | null = null;
let cachedAt = 0;
const DEDUPE_MS = 5_000;

async function fetchAppConfig(): Promise<AppConfigShape> {
  const now = Date.now();
  if (inFlight && now - cachedAt < DEDUPE_MS) return inFlight;

  cachedAt = now;
  inFlight = (async (): Promise<AppConfigShape> => {
    try {
      const res = await fetch(`${API}/app-config`, { cache: 'no-store' });
      if (!res.ok) throw new Error('app-config unavailable');
      return (await res.json()) as AppConfigShape;
    } catch {
      return {};
    }
  })();

  return inFlight;
}

function isValidHomeSections(value: unknown): value is HomeSectionConfig[] {
  if (!Array.isArray(value)) return false;
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') return false;
    const s = item as Partial<HomeSectionConfig>;
    if (!s.key || !HOME_SECTION_KEYS.includes(s.key)) return false;
    if (typeof s.enabled !== 'boolean') return false;
    if (typeof s.order !== 'number') return false;
    if (s.title !== null && s.title !== undefined && typeof s.title !== 'string') return false;
    if (s.limit !== null && s.limit !== undefined && typeof s.limit !== 'number') return false;
    seen.add(s.key);
  }
  return seen.size === HOME_SECTION_KEYS.length;
}

/**
 * Config de la home (présence/ordre/titre/limite des 7 sections) — jamais
 * de rendu piloté ici, uniquement ces 4 attributs (voir mission). Repli
 * intégral sur DEFAULT_HOME_SECTIONS si absente/invalide/panne réseau.
 */
export async function getHomeSectionsConfig(): Promise<HomeSectionConfig[]> {
  try {
    const config = await fetchAppConfig();
    const sections = config.home?.home_sections;
    if (isValidHomeSections(sections)) return sections;
  } catch { /* repli ci-dessous */ }
  return DEFAULT_HOME_SECTIONS;
}

function isValidRankingTiers(value: unknown): value is RankingRadiusTier[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  let prev = 0;
  for (const item of value) {
    if (!item || typeof item !== 'object') return false;
    const t = item as Partial<RankingRadiusTier>;
    if (typeof t.km !== 'number' || t.km <= prev || t.km > 2000) return false;
    if (typeof t.label !== 'string' || t.label.trim() === '') return false;
    prev = t.km;
  }
  return true;
}

/**
 * Paliers de rayon du classement local sur la home client — même rôle que
 * l'ancienne constante RADIUS_TIERS de homeFilters.ts, désormais pilotable
 * sans build. Repli intégral sur DEFAULT_RANKING_RADIUS_TIERS si absent/
 * invalide/panne réseau.
 */
export async function getRankingRadiusTiers(): Promise<RankingRadiusTier[]> {
  try {
    const config = await fetchAppConfig();
    const tiers = config.recherche?.ranking_radius_tiers_km;
    if (isValidRankingTiers(tiers)) return tiers;
  } catch { /* repli ci-dessous */ }
  return DEFAULT_RANKING_RADIUS_TIERS;
}
