import AppShell from '@/components/layout/AppShell';
import HeroSearch from '@/components/ui/HeroSearch';
import HomeCTASection from '@/components/ui/HomeCTASection';
import HomePersonalized from '@/components/ui/HomePersonalized';
import { CoupDeCoeurStrip, PopularStrip, NewTalentsStrip } from '@/components/ui/HomeGeoStrips';
import PersonalizedSection from '@/components/ui/PersonalizedSection';
import TopRatedGeoSection from '@/components/ui/TopRatedGeoSection';
import Image from 'next/image';
import Link from 'next/link';
import type { ApiHairdresserProfile, ApiPost, ApiUser, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';
import { ChevronRight } from 'lucide-react';

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

// ── Shared: Section header ────────────────────────────────────────────────────

function SectionHeader({
  title, subtitle, href, tag,
}: {
  title: string; subtitle?: string; href?: string; tag?: string;
}) {
  return (
    <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between gap-3">
      <div>
        {tag && (
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-400 mb-1.5">{tag}</p>
        )}
        <h2 className="text-[20px] md:text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">{title}</h2>
        {subtitle && <p className="text-[12px] text-neutral-400 mt-1 leading-relaxed max-w-sm">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
          <ChevronRight size={16} strokeWidth={2.5} className="text-neutral-900" />
        </Link>
      )}
    </div>
  );
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
            className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 group"
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
  const [featuredHD, newTalentsHD, popularHD, ratedHD, trendingPosts] = await Promise.all([
    getHairdressers('featured', 10),
    getHairdressers('new_quality', 8, 60),
    getHairdressers('popular', 8),
    getHairdressers('rating', 5),
    getFeedPosts('trending', 24),
  ]);

  const displayPosts = trendingPosts.filter((p) => getAfterImage(p) && p.hairdresser);

  return (
    <AppShell>

      {/* Recherche sticky */}
      <div className="sticky top-content-mobile md:top-[60px] z-40 bg-white border-b border-neutral-100">
        <div className="px-4 py-3 max-w-2xl md:max-w-3xl md:mx-auto">
          <HeroSearch compact />
        </div>
      </div>

      {/* ① Pour vous — catégories inspirations */}
      <HomePersonalized />

      {/* ② Coup de cœur CHAIR */}
      <CoupDeCoeurStrip fallback={featuredHD} />

      {/* ③ Spécialiste — dépend de l'onboarding */}
      <PersonalizedSection />

      {/* ④ Les plus demandés */}
      <PopularStrip fallback={popularHD} />

      {/* ⑤ Réalisations du moment */}
      {displayPosts.length > 0 && (
        <section className="pt-10">
          <SectionHeader tag="Inspiration" title="Réalisations du moment" subtitle="Les plus belles créations de la communauté" href="/app/feed" />
          <RealisationGrid posts={displayPosts} />
        </section>
      )}

      {/* ⑥ Nouveaux talents */}
      <NewTalentsStrip fallback={newTalentsHD} />

      {/* ⑦ Les mieux notés — géolocalisé */}
      <TopRatedGeoSection fallback={ratedHD} />

      <div className="mx-4 md:mx-8 mt-10 h-px bg-neutral-100 max-w-6xl md:mx-auto" />

      {/* ⑧ Vous êtes coiffeur */}
      <HomeCTASection
        hairdressersCount={featuredHD.length}
        postsCount={displayPosts.length}
      />

    </AppShell>
  );
}
