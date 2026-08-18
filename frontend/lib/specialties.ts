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
  image_url: string | null;
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

// Taxonomie finale (14 spécialités actives, décidée avec Julien le
// 2026-08-18) : 6 homme + 8 femme. Source UNIQUE de la répartition par genre
// — avant, chaque écran (SpecialtyPicker PRO, compte/modifier, onboarding
// client) codait sa propre liste en dur, désynchronisées entre elles (des
// spécialités actives en base n'apparaissaient nulle part). Toute évolution
// de cette répartition se fait ICI, jamais en dupliquant une liste ailleurs.
export const HOMME_SPECIALTY_SLUGS = ['barber', 'coupe-homme', 'coupe-longue', 'barbe', 'couleur-homme', 'afro-locks'];
export const FEMME_SPECIALTY_SLUGS = ['couleur-balayage', 'coupe-femme', 'boucles-curly', 'texture-lissage', 'coloration', 'evenementiel', 'extensions', 'soins-transformation'];

/**
 * Illustrations de repli — utilisées uniquement quand une spécialité n'a pas
 * encore de vraie photo en base (Specialty.image_url, administrable depuis
 * Configuration > Spécialités). Priorité toujours : image_url > ce repli >
 * emoji (s.icon) > icône vectorielle générique > jamais un carré vide.
 */
export const SPECIALTY_ILLUSTRATIONS: Record<string, string> = {
  'couleur-balayage':     '/onboarding/balayage.png',
  'coupe-femme':          '/onboarding/coupe.png',
  'boucles-curly':        '/onboarding/boucles.png',
  'texture-lissage':      '/onboarding/lissage.png',
  'coloration':           '/onboarding/couleur-femme.png',
  'barber':               '/onboarding/barber.png',
  'coupe-homme':          '/onboarding/classique.png',
  'coupe-longue':         '/onboarding/cheveux-longs.png',
  'barbe':                '/onboarding/barbe.png',
  'couleur-homme':        '/onboarding/couleur.png',
  'afro-locks':           '/onboarding/dreads.png',
  'soins-transformation': '/onboarding/couleur.png',
  'evenementiel':         '/onboarding/chignon.png',
  'extensions':           '/onboarding/cheveux-longs.png',
};

// Cache mémoire court + dédoublonnage des requêtes concurrentes — même
// contrat que lib/appConfig.ts : jamais plus qu'un fetch par fenêtre, jamais
// bloquant, repli silencieux si l'API échoue.
let cachedList: LiveSpecialty[] | null = null;
let cachedLabels: Record<string, string> | null = null;
let cachedImages: Record<string, string> | null = null;
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
      cachedImages = {};
      data.forEach((s) => {
        if (s.slug && s.name) cachedLabels![s.slug] = s.name;
        if (s.slug && s.image_url) cachedImages![s.slug] = s.image_url;
      });
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

/** Photos live (slug → image_url) — uniquement les spécialités qui ont une
 *  vraie photo en base (administrable sans build depuis Configuration >
 *  Spécialités). Un slug absent de ce Record n'a pas encore de photo :
 *  l'appelant doit retomber sur son illustration statique locale, jamais
 *  afficher un carré vide. `{}` si l'API est indisponible. */
export async function getLiveSpecialtyImages(): Promise<Record<string, string>> {
  await fetchLiveList();
  return cachedImages ?? {};
}
