import AppShell from '@/components/layout/AppShell';
import HeroSearch from '@/components/ui/HeroSearch';
import FeedPostCard from '@/components/ui/FeedPostCard';
import HairdresserCard from '@/components/ui/HairdresserCard';
import HomeCTABlock from '@/components/ui/HomeCTABlock';
import Image from 'next/image';
import Link from 'next/link';
import type { ApiHairdresserProfile, ApiPost, ApiSpecialty, PaginatedResponse } from '@/lib/types';

const API = 'http://localhost:8000/api';

// ── Photos éditoriales par spécialité (Unsplash) ─────────────────────
const SPECIALTY_TILES: Record<string, string> = {
  'balayage':        'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=300&q=80',
  'blond':           'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=300&q=80',
  'coloration':      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&q=80',
  'ombre-hair':      'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=300&q=80',
  'hair-contouring': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80',
  'coupe-femme':     'https://images.unsplash.com/photo-1595476589022-7c86ade2c24d?w=300&q=80',
  'coupe-homme':     'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&q=80',
  'barber':          'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&q=80',
  'boucles':         'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=300&q=80',
  'extensions':      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=300&q=80',
  'lissage':         'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=300&q=80',
  'mariage':         'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=80',
};

const HERO_IMAGE = 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1600&q=90';

// ── Fetches ────────────────────────────────────────────────────────────
async function getHairdressers(): Promise<ApiHairdresserProfile[]> {
  try {
    const res = await fetch(`${API}/hairdressers`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data: PaginatedResponse<ApiHairdresserProfile> = await res.json();
    return data.data;
  } catch { return []; }
}

async function getFeed(): Promise<ApiPost[]> {
  try {
    const res = await fetch(`${API}/feed`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data: PaginatedResponse<ApiPost> = await res.json();
    return data.data;
  } catch { return []; }
}

async function getSpecialties(): Promise<ApiSpecialty[]> {
  try {
    const res = await fetch(`${API}/specialties`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

// ── Page ───────────────────────────────────────────────────────────────
export default async function HomePage() {
  const [hairdressers, posts, specialties] = await Promise.all([
    getHairdressers(),
    getFeed(),
    getSpecialties(),
  ]);

  return (
    <AppShell noPaddingTop>

      {/* ══════════════════════════════════════════════════
          HERO — plein écran avec recherche intégrée
      ══════════════════════════════════════════════════ */}
      <section className="relative min-h-[88svh] md:min-h-screen flex flex-col justify-end overflow-hidden">

        {/* Image de fond */}
        <Image
          src={HERO_IMAGE}
          alt="Transformation capillaire"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />

        {/* Gradients superposés */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

        {/* Logo CHAIR — mobile uniquement (desktop = TopNav) */}
        <div className="absolute top-5 left-5 md:hidden">
          <Link href="/" className="text-[18px] font-bold tracking-[0.14em] uppercase text-white">
            CHAIR
          </Link>
        </div>

        {/* Contenu hero */}
        <div className="relative z-10 px-5 pb-10 md:pb-16 md:text-center md:px-8">

          {/* Headline */}
          <div className="mb-3 md:mb-5">
            <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-white/50 mb-3 md:mb-4">
              La plateforme des coiffeurs professionnels
            </p>
            <h1 className="text-[38px] md:text-[64px] font-bold leading-[1.05] tracking-tight text-white max-w-2xl md:mx-auto">
              Trouvez le coiffeur{' '}
              <span className="italic font-light text-white/80">fait pour vous.</span>
            </h1>
          </div>

          {/* Sous-titre desktop */}
          <p className="hidden md:block text-[15px] text-white/60 leading-relaxed mb-8 max-w-md mx-auto">
            Portfolios réels, avis certifiés, spécialistes par technique et par ville.
          </p>

          {/* Barre de recherche */}
          <div className="mt-5 md:mt-0">
            <HeroSearch />
          </div>

          {/* Stats rapides sous la recherche — desktop */}
          <div className="hidden md:flex items-center justify-center gap-8 mt-6 text-white/50 text-xs font-medium tracking-wide">
            <span>{hairdressers.length}+ coiffeurs</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Portfolios vérifiés</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Avis certifiés</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          SPÉCIALITÉS — tuiles visuelles horizontales
      ══════════════════════════════════════════════════ */}
      {specialties.length > 0 && (
        <section className="pt-6 pb-2 md:pt-10">
          <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-3 flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              Explorer par spécialité
            </h2>
            <Link href="/rechercher" className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors">
              Tout voir →
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-2 no-scrollbar">
            {specialties.map((s) => {
              const photo = SPECIALTY_TILES[s.slug];
              return (
                <Link
                  key={s.slug}
                  href={`/rechercher?specialty=${s.slug}`}
                  className="flex-shrink-0 group"
                >
                  <div className="relative w-[76px] h-[76px] md:w-[90px] md:h-[90px] rounded-2xl overflow-hidden bg-neutral-900">
                    {photo && (
                      <Image
                        src={photo}
                        alt={s.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        sizes="90px"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 text-center">
                      <p className="text-[9px] md:text-[10px] font-semibold text-white leading-tight">
                        {s.name}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════
          FEED — Réalisations (grille dense, image first)
      ══════════════════════════════════════════════════ */}
      <section className="px-3 md:px-8 max-w-6xl md:mx-auto mt-6 md:mt-10">
        <div className="flex items-baseline justify-between mb-3 px-1">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-900">
            Réalisations du moment
          </h2>
          <span className="text-[11px] text-neutral-400">
            {posts.length > 0 ? `${posts.length} publiées` : ''}
          </span>
        </div>

        {posts.length > 0 ? (
          <>
            {/* Grille 2 colonnes mobile, 3 colonnes desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {posts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  hairdresser={post.hairdresser}
                  aspect="portrait"
                />
              ))}
            </div>

            <div className="text-center mt-6">
              <Link
                href="/rechercher"
                className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 border border-neutral-200 px-6 py-3 rounded-full hover:border-neutral-900 hover:bg-neutral-50 transition-all"
              >
                Voir tous les coiffeurs
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-neutral-400">Les premières réalisations arrivent bientôt.</p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════
          COIFFEURS — À découvrir (scroll horizontal)
      ══════════════════════════════════════════════════ */}
      {hairdressers.length > 0 && (
        <section className="mt-10 md:mt-14">
          <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-3 flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-900">
              À découvrir
            </h2>
            <Link href="/rechercher" className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors">
              Voir tout →
            </Link>
          </div>

          {/* Scroll horizontal de cartes portrait */}
          <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
            {hairdressers.slice(0, 8).map((h) => (
              <div key={h.id} className="flex-shrink-0 w-[160px] md:w-[200px]">
                <HairdresserCard hairdresser={h} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════
          PREUVE SOCIALE + CTA inscription (visiteurs uniquement)
      ══════════════════════════════════════════════════ */}
      <HomeCTABlock hairdressersCount={hairdressers.length} postsCount={posts.length} />

    </AppShell>
  );
}
