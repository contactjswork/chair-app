// Source unique des libellés de spécialités CHAIR. Les 10 "vedettes"
// ci-dessous ne sont qu'un REPLI honnête (API indisponible, panne réseau,
// backend pas encore déployé) — jamais un slug brut affiché à l'utilisateur.
// La vraie source de vérité est /api/specialties (table `specialties`,
// administrable sans build depuis Configuration > Spécialités, voir
// AdminSpecialtyController) : un renommage y est instantané, à condition que
// l'écran appelant lise bien getLiveSpecialtyLabels()/getLiveSpecialties()
// plutôt qu'un texte figé dans le composant.

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export interface LiveSpecialty {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  category: string | null;
  order: number;
}

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

// Cache mémoire court + dédoublonnage des requêtes concurrentes — même
// contrat que lib/appConfig.ts : jamais plus qu'un fetch par fenêtre, jamais
// bloquant, repli silencieux si l'API échoue.
let cachedList: LiveSpecialty[] | null = null;
let cachedLabels: Record<string, string> | null = null;
let cachedAt = 0;
let inFlight: Promise<LiveSpecialty[]> | null = null;
const DEDUPE_MS = 30_000;

async function fetchLiveList(): Promise<LiveSpecialty[]> {
  const now = Date.now();
  if (cachedList && now - cachedAt < DEDUPE_MS) return cachedList;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(`${API}/specialties`, { cache: 'no-store' });
      if (!res.ok) throw new Error('specialties unavailable');
      const data = (await res.json()) as LiveSpecialty[];
      cachedList = data;
      cachedLabels = { ...SPECIALTY_LABELS };
      data.forEach((s) => { if (s.slug && s.name) cachedLabels![s.slug] = s.name; });
      cachedAt = now;
      return data;
    } catch {
      // Ne jamais faire planter l'affichage — repli sur les libellés statiques.
      return [];
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Liste live complète (id/slug/name/icon/order), actives uniquement — []
 *  si l'API est indisponible (l'appelant doit alors garder son propre repli). */
export async function getLiveSpecialties(): Promise<LiveSpecialty[]> {
  return fetchLiveList();
}

/** Libellés live (slug → name) — fusionnés sur SPECIALTY_LABELS pour ne
 *  jamais perdre une entrée connue si l'API renvoie un sous-ensemble. Repli
 *  intégral sur SPECIALTY_LABELS si l'API est indisponible. */
export async function getLiveSpecialtyLabels(): Promise<Record<string, string>> {
  await fetchLiveList();
  return cachedLabels ?? SPECIALTY_LABELS;
}
