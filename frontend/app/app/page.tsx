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
import { getHomeSectionsConfig, type HomeSectionConfig } from '@/lib/appConfig';
import { HomeDedupeProvider } from '@/contexts/HomeDedupeContext';
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
  // Présence/ordre/titre/limite des 7 sections ci-dessous — piloté par le
  // Super Admin sans build (app_settings 'home_sections', groupe 'home').
  // Repli intégral sur l'ordre historique si absent/invalide/panne réseau
  // (voir lib/appConfig.ts) : LE RENDU de chaque section reste toujours géré
  // ici par le code, la config ne fait QUE piloter ces 4 attributs.
  const sections = await getHomeSectionsConfig();
  const sectionByKey = new Map(sections.map((s) => [s.key, s]));
  const isEnabled = (key: HomeSectionConfig['key']) => sectionByKey.get(key)?.enabled ?? true;
  const orderedKeys = [...sections].sort((a, b) => a.order - b.order).map((s) => s.key);

  const coupDeCoeurLimit = sectionByKey.get('coup_de_coeur')?.limit ?? 10;
  const rankingLimit = sectionByKey.get('ranking')?.limit ?? 5;
  const newTalentsLimit = sectionByKey.get('new_talents')?.limit ?? 8;

  const [featuredHD, newTalentsHD, ranking, trendingPosts] = await Promise.all([
    isEnabled('coup_de_coeur') ? getHairdressers('featured', coupDeCoeurLimit) : Promise.resolve([]),
    isEnabled('new_talents') ? getHairdressers('new_quality', newTalentsLimit, 60) : Promise.resolve([]),
    isEnabled('ranking') ? getRanking(rankingLimit) : Promise.resolve([]),
    isEnabled('realisations') ? getFeedPosts('trending', 24) : Promise.resolve([]),
  ]);

  const sectionRenderers: Record<HomeSectionConfig['key'], () => React.ReactNode> = {
    home_personalized: () => (
      // ① Pour vous — le vrai moteur de recommandation (GET
      // /api/recommendations) : spécialité choisie D'ABORD, puis
      // proximité, réputation, CHAIR+ en dernier départage. Premier
      // contenu substantiel du fil, avant même les raccourcis spécialité —
      // c'est la promesse "pas juste le plus proche" de CHAIR.
      <HomePersonalized
        key="home_personalized"
        titleOverride={sectionByKey.get('home_personalized')?.title ?? undefined}
        limit={sectionByKey.get('home_personalized')?.limit ?? undefined}
      />
    ),
    specialty_quick_links: () => (
      // Raccourcis spécialité — mêmes 10 catégories pour tout le monde,
      // mais réordonnées : les préférences réelles en tête, "Voir tout"
      // pour le reste. Sert à pivoter/filtrer si le ① n'a pas suffi.
      <SpecialtyQuickLinks key="specialty_quick_links" limit={sectionByKey.get('specialty_quick_links')?.limit ?? undefined} />
    ),
    coup_de_coeur: () => (
      // ② Coup de cœur CHAIR — sélection éditoriale, variété au milieu du fil
      <CoupDeCoeurStrip
        key="coup_de_coeur"
        fallback={featuredHD}
        titleOverride={sectionByKey.get('coup_de_coeur')?.title}
        limit={coupDeCoeurLimit}
      />
    ),
    ranking: () => (
      // ③ Classement — local, scopé sur votre/vos spécialité(s), preuve sociale
      <HomeRankingSection
        key="ranking"
        fallback={ranking}
        titleOverride={sectionByKey.get('ranking')?.title}
        limit={rankingLimit}
      />
    ),
    nearby_map: () => (
      // ④ Carte — rupture de rythme visuelle (spatiale) avant la grille réalisations
      <NearbyMapSection
        key="nearby_map"
        titleOverride={sectionByKey.get('nearby_map')?.title ?? undefined}
        limit={sectionByKey.get('nearby_map')?.limit ?? undefined}
      />
    ),
    realisations: () => (
      // ⑤ Réalisations — grille 3 colonnes ciblée sur vos spécialités,
      // rupture de rythme avec les carrousels horizontaux qui précèdent
      <HomeRealisationsSection
        key="realisations"
        fallback={trendingPosts}
        titleOverride={sectionByKey.get('realisations')?.title}
        limit={sectionByKey.get('realisations')?.limit ?? undefined}
      />
    ),
    new_talents: () => (
      // ⑥ Nouveaux talents — découverte secondaire, fin de fil
      <NewTalentsStrip
        key="new_talents"
        fallback={newTalentsHD}
        titleOverride={sectionByKey.get('new_talents')?.title}
        limit={newTalentsLimit}
      />
    ),
  };

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

      {/* Les 7 sections ci-dessous : présence/ordre/titre/limite pilotés par
          la config Super Admin (voir getHomeSectionsConfig ci-dessus).
          HomeDedupeProvider : évite qu'un même coiffeur apparaisse dans
          plusieurs sections "personnes" (Pour vous / Coup de cœur /
          Nouveaux talents), voir contexts/HomeDedupeContext.tsx. */}
      <HomeDedupeProvider>
        {orderedKeys.map((key) => (isEnabled(key) ? sectionRenderers[key]() : null))}
      </HomeDedupeProvider>

      <div className="mx-4 md:mx-8 mt-10 h-px bg-neutral-100 max-w-6xl md:mx-auto" />

      {/* ⑦ Vous êtes coiffeur */}
      <HomeCTASection
        hairdressersCount={featuredHD.length}
        postsCount={trendingPosts.length}
      />

    </AppShell>
  );
}
