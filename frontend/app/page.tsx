import AppShell from '@/components/layout/AppShell';
import HeroSearch from '@/components/ui/HeroSearch';
import HairdresserCard from '@/components/ui/HairdresserCard';
import HomeCTASection from '@/components/ui/HomeCTASection';
import NearbySection from '@/components/ui/NearbySection';
import PersonalizedSection from '@/components/ui/PersonalizedSection';
import PersonalizedFeedSection from '@/components/ui/PersonalizedFeedSection';
import SpecialtiesSection from '@/components/ui/SpecialtiesSection';
import Image from 'next/image';
import Link from 'next/link';
import type { ApiHairdresserProfile, ApiPost, ApiSpecialty, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';
import { Star, ArrowRight } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

const HERO_IMAGE =
  'https://res.cloudinary.com/dnwtc0dra/image/upload/v1780319283/4E2F152B-B263-4BC0-BD94-E9AD00552B9C_iwobpj.png';

// ── Data fetching ─────────────────────────────────────────────────────────

async function getSpecialties(): Promise<ApiSpecialty[]> {
  try {
    const res = await fetch(`${API}/specialties`, { cache: 'no-store' });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

async function getHairdressers(
  sort: string,
  perPage = 6,
  days?: number,
): Promise<ApiHairdresserProfile[]> {
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

// ── Composants internes ───────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[17px] md:text-[19px] font-bold text-neutral-900 tracking-tight leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex-shrink-0 flex items-center gap-1 text-[12px] font-semibold text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          Voir tout <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

// Strip d'avatars circulaires — "Coiffeurs à la une"
function FeaturedAvatarStrip({ hairdressers }: { hairdressers: ApiHairdresserProfile[] }) {
  return (
    <section className="mt-8 md:mt-10">
      <SectionHeader
        title="Coiffeurs à la une"
        subtitle="Les profils les mieux notés du moment"
        href="/rechercher"
      />
      <div className="flex gap-5 overflow-x-auto px-4 md:px-8 pb-2 no-scrollbar">
        {hairdressers.map((h) => {
          const avatar = resolveMediaUrl(h.user.avatar);
          const firstName = h.user.name.split(' ')[0];
          const spec = h.specialties[0];
          return (
            <Link
              key={h.id}
              href={`/coiffeur/${h.slug}`}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
              style={{ width: 72 }}
            >
              {/* Avatar circulaire */}
              <div className="relative w-[64px] h-[64px] rounded-full overflow-hidden bg-neutral-900 ring-2 ring-neutral-100 group-hover:ring-neutral-300 transition-all duration-200 shadow-sm">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={h.user.name}
                    fill
                    sizes="64px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                    <span className="text-[22px] font-bold text-white/30 select-none">
                      {h.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Badge note */}
                {h.reviews_count > 0 && (
                  <div className="absolute bottom-0 right-0 bg-white rounded-full w-[18px] h-[18px] flex items-center justify-center shadow-md border border-neutral-100">
                    <Star size={8} className="fill-neutral-900 stroke-none" />
                  </div>
                )}
              </div>
              {/* Nom + spécialité */}
              <div className="text-center w-full">
                <p className="text-[11px] font-semibold text-neutral-900 truncate leading-tight">{firstName}</p>
                {spec && (
                  <p className="text-[9px] text-neutral-400 truncate leading-tight mt-0.5">{spec.name}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Page principale ───────────────────────────────────────────────────────

export default async function HomePage() {
  const [specialties, featuredHD, newTalentsHD, trendingPosts] = await Promise.all([
    getSpecialties(),
    getHairdressers('featured', 6),       // Score qualité composite + is_featured
    getHairdressers('new_quality', 6, 60), // Profils récents avec seuil qualité
    getFeedPosts('trending', 12),          // Score engagements + saves + qualité
  ]);

  const displayPosts = trendingPosts.filter((p) => getAfterImage(p) && p.hairdresser);

  return (
    <AppShell noPaddingTop>

      {/* ══════════════════════════════════════════════════════
          1. HERO — plein écran avec barre de recherche
      ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-[88svh] md:min-h-screen flex flex-col justify-end overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt="Transformation capillaire"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

        {/* Logo mobile */}
        <div className="absolute top-5 left-5 md:hidden">
          <Link href="/" className="text-[18px] font-bold tracking-[0.14em] uppercase text-white">
            CHAIR
          </Link>
        </div>

        <div className="relative z-10 px-5 pb-10 md:pb-16 md:text-center md:px-8">
          <div className="mb-5 md:mb-7">
            <p className="text-[10px] font-semibold tracking-[0.35em] uppercase text-white/40 mb-3 md:mb-4">
              La plateforme des coiffeurs professionnels
            </p>
            <h1 className="text-[38px] md:text-[68px] font-bold leading-[1.02] tracking-tight text-white max-w-2xl md:mx-auto">
              Trouvez le coiffeur{' '}
              <span className="italic font-light text-white/70">fait pour vous.</span>
            </h1>
          </div>
          <p className="hidden md:block text-[15px] text-white/50 leading-relaxed mb-8 max-w-lg mx-auto">
            Portfolios réels, avis certifiés. Recherchez par technique, par ville, par style.
          </p>
          <HeroSearch />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2. EXPLORER PAR SPÉCIALITÉ — filtré par genre si préférences
      ══════════════════════════════════════════════════════ */}
      <SpecialtiesSection specialties={specialties} />

      {/* ══════════════════════════════════════════════════════
          3. COIFFEURS À LA UNE — strip d'avatars circulaires
      ══════════════════════════════════════════════════════ */}
      {featuredHD.length > 0 && <FeaturedAvatarStrip hairdressers={featuredHD} />}

      {/* ══════════════════════════════════════════════════════
          4. INSPIRATIONS — posts personnalisés (si connecté + préférences)
      ══════════════════════════════════════════════════════ */}
      <PersonalizedFeedSection />

      {/* ══════════════════════════════════════════════════════
          5. SPÉCIALISTES POUR TOI — coiffeurs par spécialité
      ══════════════════════════════════════════════════════ */}
      <PersonalizedSection />

      {/* ══════════════════════════════════════════════════════
          6. COIFFEURS AUTOUR DE VOUS — score distance + qualité
      ══════════════════════════════════════════════════════ */}
      <NearbySection />

      {/* ══════════════════════════════════════════════════════
          7. NOUVEAUX TALENTS — profils récents (≤60j) avec seuil qualité
      ══════════════════════════════════════════════════════ */}
      {newTalentsHD.length > 0 && (
        <section className="mt-10 md:mt-14 mb-4">
          <SectionHeader
            title="Nouveaux talents"
            subtitle="Ils viennent de rejoindre CHAIR"
          />
          <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
            {newTalentsHD.map((h) => (
              <div key={h.id} className="relative flex-shrink-0 w-[160px] md:w-[190px]">
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="text-[9px] font-semibold tracking-[0.12em] uppercase text-white bg-neutral-900/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    Nouveau
                  </span>
                </div>
                <HairdresserCard hairdresser={h} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          7. CTA ACQUISITION — coiffeurs + clients non connectés
      ══════════════════════════════════════════════════════ */}
      <HomeCTASection
        hairdressersCount={featuredHD.length}
        postsCount={displayPosts.length}
      />

    </AppShell>
  );
}
