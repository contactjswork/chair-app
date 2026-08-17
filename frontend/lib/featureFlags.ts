// Feature flags dynamiques (Super Admin, voir backend FeatureFlagController
// GET /api/feature-flags). Même contrat que appConfig.ts : ne DOIT jamais
// faire planter l'app — une panne réseau retombe sur DEFAULT_FLAGS (tout
// actif, aucune fonctionnalité livrée n'est désactivée par erreur).

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export const DEFAULT_FLAGS = {
  chair_plus_enabled: true,
  referrals_enabled: true,
  chair_rental_enabled: true,
  recruitment_enabled: true,
  rankings_enabled: true,
  objectives_enabled: true,
} as const;

export type FeatureFlagKey = keyof typeof DEFAULT_FLAGS;
export type FeatureFlagMap = Record<string, boolean>;

let inFlight: Promise<FeatureFlagMap> | null = null;
let cachedAt = 0;
const DEDUPE_MS = 5_000;

async function fetchFlags(): Promise<FeatureFlagMap> {
  const now = Date.now();
  if (inFlight && now - cachedAt < DEDUPE_MS) return inFlight;

  cachedAt = now;
  inFlight = (async (): Promise<FeatureFlagMap> => {
    try {
      const res = await fetch(`${API}/feature-flags`, { cache: 'no-store' });
      if (!res.ok) throw new Error('feature-flags unavailable');
      const data = await res.json();
      if (!data || typeof data !== 'object') throw new Error('invalid shape');
      return data as FeatureFlagMap;
    } catch {
      return { ...DEFAULT_FLAGS };
    }
  })();

  return inFlight;
}

export async function getFeatureFlags(): Promise<FeatureFlagMap> {
  return fetchFlags();
}

/** Un flag précis — true par défaut si absent (jamais désactivé par erreur). */
export async function isFeatureEnabled(key: FeatureFlagKey | string): Promise<boolean> {
  const flags = await fetchFlags();
  return key in flags ? Boolean(flags[key]) : true;
}
