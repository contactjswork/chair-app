import AppShell from '@/components/layout/AppShell';
import HideOnScrollBar from '@/components/layout/HideOnScrollBar';
import HeroSearch from '@/components/ui/HeroSearch';
import StoriesBar from '@/components/ui/StoriesBar';
import HomeCTASection from '@/components/ui/HomeCTASection';
import SpecialtyQuickLinks from '@/components/ui/SpecialtyQuickLinks';
import LocationBar from '@/components/ui/LocationBar';
import HomePersonalized from '@/components/ui/HomePersonalized';
import { CoupDeCoeurStrip, NewTalentsStrip } from '@/components/ui/HomeGeoStrips';
import HomeRankingSection, { type RankedEntry } from '@/components/ui/HomeRankingSection';
import NearbyMapSection from '@/components/ui/NearbyMapSection';
import HomeRealisationsSection from '@/components/ui/HomeRealisationsSection';
import type { ApiHairdresserProfile, ApiPost, PaginatedResponse } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Data fetching (fallback SSR — non personnalisé, affiné côté client) ───────

async function getHairdressers(sort: string, perPage = 6, days?: number): Promise<ApiHairdresserProfile[]> {
  try {
    const params = new URLSearchParams({ sort, per_page: String(perPage) });
    if (days) params.set('days', String(days));
    const res = await fetch(`${API}/hairdressers?${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data: PaginatedResponse<ApiHairdresserProfile> = await res.json();
    return data.data;
  } catch { return []; }
}

async function getFeedPosts(sort: string, perPage = 12): Promise<ApiPost[]> {
  try {
    const params = new URLSearchParams({ sort, per_page: String(perPage) });
    const res = await fetch(`${API}/feed?${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data: PaginatedResponse<ApiPost> = await res.json();
    return data.data;
  } catch { return []; }
}

/** Vrai classement CHAIR (score "engagement", même formule que /app/classements). */
async function getRanking(limit = 5): Promise<RankedEntry[]> {
  try {
    const params = new URLSearchParams({ type: 'engagement', limit: String(limit) });
    const res = await fetch(`${API}/leaderboard?${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data: { results: RankedEntry[] } = await res.json();
    return data.results;
  } catch { return []; }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [featuredHD, newTalentsHD, ranking, trendingPosts] = await Promise.all([
    getHairdressers('featured', 10),
    getHairdressers('new_quality', 8, 60),
    getRanking(5),
    getFeedPosts('trending', 24),
  ]);

  return (
    <AppShell>

      {/* Recherche — se cache au scroll vers le bas, réapparaît vers le haut (mobile) */}
      <HideOnScrollBar>
        <div className="px-4 py-3 max-w-2xl md:max-w-3xl md:mx-auto">
          <HeroSearch compact />
        </div>
      </HideOnScrollBar>

      {/* Ville active — pilote tout le filtrage géo de la home, changeable ici */}
      <LocationBar />

      {/* Stories — coiffeurs suivis uniquement, jamais un feed mondial. Se
          masque toute seule si vide (visiteur, ou personne suivi) : ne
          repousse jamais le contenu personnalisé ci-dessous d'un espace
          vide. */}
      <StoriesBar />

      {/* ① Pour vous — le vrai moteur de recommandation (GET
          /api/recommendations) : spécialité choisie D'ABORD, puis
          proximité, réputation, CHAIR+ en dernier départage. Premier
          contenu substantiel du fil, avant même les raccourcis spécialité —
          c'est la promesse "pas juste le plus proche" de CHAIR. */}
      <HomePersonalized />

      {/* Raccourcis spécialité — mêmes 10 catégories pour tout le monde,
          mais réordonnées : les préférences réelles en tête, "Voir tout"
          pour le reste. Sert à pivoter/filtrer si le ① n'a pas suffi. */}
      <SpecialtyQuickLinks />

      {/* ② Coup de cœur CHAIR — sélection éditoriale, variété au milieu du fil */}
      <CoupDeCoeurStrip fallback={featuredHD} />

      {/* ③ Classement — local, scopé sur votre/vos spécialité(s), preuve sociale */}
      <HomeRankingSection fallback={ranking} />

      {/* ④ Carte — rupture de rythme visuelle (spatiale) avant la grille réalisations */}
      <NearbyMapSection />

      {/* ⑤ Réalisations — grille 3 colonnes ciblée sur vos spécialités,
          rupture de rythme avec les carrousels horizontaux qui précèdent */}
      <HomeRealisationsSection fallback={trendingPosts} />

      {/* ⑥ Nouveaux talents — découverte secondaire, fin de fil */}
      <NewTalentsStrip fallback={newTalentsHD} />

      <div className="mx-4 md:mx-8 mt-10 h-px bg-neutral-100 max-w-6xl md:mx-auto" />

      {/* ⑦ Vous êtes coiffeur */}
      <HomeCTASection
        hairdressersCount={featuredHD.length}
        postsCount={trendingPosts.length}
      />

    </AppShell>
  );
}
