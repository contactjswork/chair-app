import AppShell from '@/components/layout/AppShell';
import HideOnScrollBar from '@/components/layout/HideOnScrollBar';
import HeroSearch from '@/components/ui/HeroSearch';
import StoriesBar from '@/components/ui/StoriesBar';
import HomeCTASection from '@/components/ui/HomeCTASection';
import HomePersonalized from '@/components/ui/HomePersonalized';
import { CoupDeCoeurStrip, PopularStrip, NewTalentsStrip, SectionHeader } from '@/components/ui/HomeGeoStrips';
import PersonalizedSection from '@/components/ui/PersonalizedSection';
import HomeRankingSection, { type RankedEntry } from '@/components/ui/HomeRankingSection';
import Image from 'next/image';
import Link from 'next/link';
import type { ApiHairdresserProfile, ApiPost, ApiUser, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Data fetching ─────────────────────────────────────────────────────────────

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

// ── Réalisations (Instagram grid) ─────────────────────────────────────────────

function RealisationGrid({ posts }: { posts: ApiPost[] }) {
  const visible = posts.slice(0, 9);
  if (visible.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-[3px] px-4 md:px-8 max-w-6xl md:mx-auto">
      {visible.map((post) => {
        const url = resolveMediaUrl(getAfterImage(post));
        const hd = post.hairdresser as (ApiHairdresserProfile & { user: ApiUser }) | undefined;
        return (
          <Link
            key={post.id}
            href={`/app/realisation/${post.id}`}
            className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 group active:scale-[0.97] transition-transform duration-150"
          >
            {url ? (
              <Image
                src={url}
                alt={post.description ?? ''}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="33vw"
              />
            ) : (
              <div className="absolute inset-0 bg-neutral-200" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {hd?.user?.name && (
              <p className="absolute bottom-2 left-2 right-2 text-white text-[11px] font-semibold truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {hd.user.name}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [featuredHD, newTalentsHD, popularHD, ranking, trendingPosts] = await Promise.all([
    getHairdressers('featured', 10),
    getHairdressers('new_quality', 8, 60),
    getHairdressers('popular', 8),
    getRanking(5),
    getFeedPosts('trending', 24),
  ]);

  const displayPosts = trendingPosts.filter((p) => getAfterImage(p) && p.hairdresser);

  return (
    <AppShell>

      {/* Recherche — se cache au scroll vers le bas, réapparaît vers le haut (mobile) */}
      <HideOnScrollBar>
        <div className="px-4 py-3 max-w-2xl md:max-w-3xl md:mx-auto">
          <HeroSearch compact />
        </div>
      </HideOnScrollBar>

      {/* Stories — coiffeurs suivis uniquement, jamais un feed mondial */}
      <StoriesBar />

      {/* ① Pour vous — catégories inspirations */}
      <HomePersonalized />

      {/* ② Coup de cœur CHAIR */}
      <CoupDeCoeurStrip fallback={featuredHD} />

      {/* ③ Spécialiste — dépend de l'onboarding */}
      <PersonalizedSection />

      {/* ④ Classement — vrai score CHAIR, pas un simple tri par note */}
      <HomeRankingSection fallback={ranking} />

      {/* ⑤ Les plus demandés */}
      <PopularStrip fallback={popularHD} />

      {/* ⑥ Réalisations du moment */}
      {displayPosts.length > 0 && (
        <section className="pt-10">
          <SectionHeader tag="Communauté" title="Réalisations du moment" href="/app/feed" />
          <RealisationGrid posts={displayPosts} />
        </section>
      )}

      {/* ⑦ Nouveaux talents */}
      <NewTalentsStrip fallback={newTalentsHD} />

      <div className="mx-4 md:mx-8 mt-10 h-px bg-neutral-100 max-w-6xl md:mx-auto" />

      {/* ⑧ Vous êtes coiffeur */}
      <HomeCTASection
        hairdressersCount={featuredHD.length}
        postsCount={displayPosts.length}
      />

    </AppShell>
  );
}
