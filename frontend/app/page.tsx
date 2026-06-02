import AppShell from '@/components/layout/AppShell';
import HeroSearch from '@/components/ui/HeroSearch';
import FeedPostCard from '@/components/ui/FeedPostCard';
import HairdresserCard from '@/components/ui/HairdresserCard';
import HomeCTASection from '@/components/ui/HomeCTASection';
import NearbySection from '@/components/ui/NearbySection';
import AvailableTodaySection from '@/components/ui/AvailableTodaySection';
import Image from 'next/image';
import Link from 'next/link';
import type { ApiHairdresserProfile, ApiPost, ApiSpecialty, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getBeforeImage, getAfterImage } from '@/lib/types';
import { Star, ArrowRight, CheckCircle, Calendar, Users, Award, Zap, MapPin } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

const HERO_IMAGE = 'https://res.cloudinary.com/dnwtc0dra/image/upload/v1780319283/4E2F152B-B263-4BC0-BD94-E9AD00552B9C_iwobpj.png';

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

// ── Data fetching ───────────────────────────────────────────────────────

async function getSpecialties(): Promise<ApiSpecialty[]> {
  try {
    const res = await fetch(`${API}/specialties`, { cache: 'no-store' });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

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

async function getFeedPosts(sort: string, perPage = 8, type?: string): Promise<ApiPost[]> {
  try {
    const params = new URLSearchParams({ sort, per_page: String(perPage) });
    if (type) params.set('type', type);
    const res = await fetch(`${API}/feed?${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data: PaginatedResponse<ApiPost> = await res.json();
    return data.data;
  } catch { return []; }
}

// ── Composants UI internes ──────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  href,
  badge,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  badge?: string;
}) {
  return (
    <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-4 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] md:text-[17px] font-bold text-neutral-900 tracking-tight">
            {title}
          </h2>
          {badge && (
            <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-neutral-400 border border-neutral-200 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[12px] text-neutral-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex-shrink-0 flex items-center gap-1 text-[12px] text-neutral-500 hover:text-neutral-900 transition-colors mt-0.5"
        >
          Tout voir <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

// Carte coiffeur avec badge optionnel
function HairdresserCardWrapper({
  hairdresser,
  rank,
  badge,
}: {
  hairdresser: ApiHairdresserProfile;
  rank?: number;
  badge?: string;
}) {
  return (
    <div className="relative flex-shrink-0 w-[152px] md:w-[180px]">
      {rank !== undefined && (
        <div className="absolute -top-2 -left-1 z-10 text-[26px] font-black text-neutral-200 leading-none select-none pointer-events-none">
          {rank}
        </div>
      )}
      {badge && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="text-[9px] font-semibold tracking-[0.12em] uppercase text-white bg-neutral-900/80 backdrop-blur-sm px-2 py-1 rounded-full">
            {badge}
          </span>
        </div>
      )}
      <HairdresserCard hairdresser={hairdresser} />
    </div>
  );
}

// Carte avant/après
function BeforeAfterCard({ post }: { post: ApiPost }) {
  const beforeUrl = resolveMediaUrl(getBeforeImage(post));
  const afterUrl  = resolveMediaUrl(getAfterImage(post));
  const hd = post.hairdresser;

  if (!afterUrl || !hd) return null;

  return (
    <Link
      href={`/realisation/${post.id}`}
      className="flex-shrink-0 w-[260px] md:w-[300px] rounded-2xl overflow-hidden bg-neutral-900 group block"
    >
      {/* Images side by side */}
      <div className={`grid ${beforeUrl ? 'grid-cols-2' : 'grid-cols-1'} gap-px bg-neutral-900 aspect-[3/2]`}>
        {beforeUrl && (
          <div className="relative overflow-hidden">
            <Image src={beforeUrl} alt="Avant" fill className="object-cover" sizes="150px" />
            <div className="absolute bottom-1.5 left-2 text-[9px] font-semibold tracking-widest uppercase text-white/70">
              Avant
            </div>
          </div>
        )}
        <div className="relative overflow-hidden">
          <Image src={afterUrl} alt="Après" fill className="object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out" sizes="150px" />
          {beforeUrl && (
            <div className="absolute bottom-1.5 right-2 text-[9px] font-semibold tracking-widest uppercase text-white/70">
              Après
            </div>
          )}
        </div>
      </div>

      {/* Infos coiffeur */}
      <div className="bg-white px-3.5 py-3">
        <p className="text-[13px] font-semibold text-neutral-900 leading-tight truncate">
          {hd.user?.name}
        </p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1 text-neutral-400">
            {hd.city && (
              <span className="text-[11px] flex items-center gap-0.5">
                <MapPin size={10} />
                {hd.city}
              </span>
            )}
          </div>
          {hd.reviews_count > 0 && (
            <div className="flex items-center gap-1">
              <Star size={10} className="fill-neutral-700 stroke-neutral-700" />
              <span className="text-[11px] font-semibold text-neutral-700">{hd.avg_rating}</span>
            </div>
          )}
        </div>
        {post.specialty && (
          <span className="inline-block mt-1.5 text-[9px] font-semibold tracking-[0.12em] uppercase text-neutral-400 bg-neutral-50 border border-neutral-100 px-2 py-0.5 rounded-full">
            {post.specialty.name}
          </span>
        )}
      </div>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [
    specialties,
    topRatedHD,
    popularHD,
    newTalentsHD,
    trendingPosts,
    beforeAfterPosts,
    recentPosts,
  ] = await Promise.all([
    getSpecialties(),
    getHairdressers('default', 6),      // Recommandés (meilleure note)
    getHairdressers('popular', 6),      // Les plus demandés (mérite)
    getHairdressers('new', 6, 90),      // Nouveaux talents (90 jours)
    getFeedPosts('trending', 8),        // Réalisations tendance
    getFeedPosts('recent', 6, 'before_after'), // Avant/Après
    getFeedPosts('recent', 6),          // Récentes (fallback)
  ]);

  // Avant/après uniquement si les posts ont vraiment les deux images
  const validBeforeAfterPosts = beforeAfterPosts.filter(
    (p) => getBeforeImage(p) !== null && getAfterImage(p) !== null
  );

  // Réalisations à afficher : trending si dispo, sinon récentes
  const displayPosts = trendingPosts.length > 0 ? trendingPosts : recentPosts;

  return (
    <AppShell noPaddingTop>

      {/* ══════════════════════════════════════════════════════
          1. HERO — plein écran
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
          <div className="mb-4 md:mb-6">
            <p className="text-[10px] font-semibold tracking-[0.35em] uppercase text-white/45 mb-3 md:mb-4">
              La plateforme des coiffeurs professionnels
            </p>
            <h1 className="text-[38px] md:text-[68px] font-bold leading-[1.02] tracking-tight text-white max-w-2xl md:mx-auto">
              Trouvez le coiffeur{' '}
              <span className="italic font-light text-white/75">fait pour vous.</span>
            </h1>
          </div>

          <p className="hidden md:block text-[15px] text-white/55 leading-relaxed mb-8 max-w-lg mx-auto">
            Portfolios réels, avis certifiés après chaque rendez-vous.
            Recherchez par technique, par ville, par style.
          </p>

          <HeroSearch />

          <div className="hidden md:flex items-center justify-center gap-8 mt-6 text-white/40 text-xs font-medium tracking-wide">
            <span>{topRatedHD.length > 0 ? `${topRatedHD.length}+` : ''} coiffeurs vérifiés</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Avis certifiés après rendez-vous</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Réservation instantanée</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2. CATÉGORIES — pills spécialités
      ══════════════════════════════════════════════════════ */}
      {specialties.length > 0 && (
        <section className="pt-6 pb-2 md:pt-10">
          <SectionHeader
            title="Explorer par spécialité"
            href="/rechercher"
          />
          <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-2 no-scrollbar">
            {specialties.map((s) => {
              const photo = SPECIALTY_TILES[s.slug];
              return (
                <Link key={s.slug} href={`/rechercher?specialty=${s.slug}`} className="flex-shrink-0 group">
                  <div className="relative w-[76px] h-[76px] md:w-[88px] md:h-[88px] rounded-2xl overflow-hidden bg-neutral-900">
                    {photo && (
                      <Image src={photo} alt={s.name} fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="88px" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 text-center">
                      <p className="text-[9px] md:text-[10px] font-semibold text-white leading-tight">{s.name}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          2b. COIFFEURS PRÈS DE VOUS — géolocalisation
      ══════════════════════════════════════════════════════ */}
      <NearbySection />

      {/* ══════════════════════════════════════════════════════
          2c. DISPONIBLES AUJOURD'HUI — géo-aware
      ══════════════════════════════════════════════════════ */}
      <AvailableTodaySection />

      {/* ══════════════════════════════════════════════════════
          3. COIFFEURS RECOMMANDÉS — futur placement Premium
      ══════════════════════════════════════════════════════ */}
      {topRatedHD.length > 0 && (
        <section className="mt-10 md:mt-14">
          <SectionHeader
            title="Recommandés"
            subtitle="Les mieux notés sur la plateforme"
            href="/rechercher"
          />
          <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
            {topRatedHD.map((h) => (
              <HairdresserCardWrapper key={h.id} hairdresser={h} />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          4. LES PLUS DEMANDÉS — classement mérite
      ══════════════════════════════════════════════════════ */}
      {popularHD.length > 0 && (
        <section className="mt-10 md:mt-14">
          <SectionHeader
            title="Les plus demandés"
            subtitle="Classement basé sur les avis, abonnés et rendez-vous"
            href="/rechercher"
          />
          <div className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
            {popularHD.map((h, i) => (
              <HairdresserCardWrapper key={h.id} hairdresser={h} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          5. RÉALISATIONS TENDANCE — grille 2 colonnes
      ══════════════════════════════════════════════════════ */}
      <section className="mt-10 md:mt-14 px-3 md:px-8 max-w-6xl md:mx-auto">
        <SectionHeader
          title="Réalisations tendance"
          subtitle="Les transformations les plus aimées du moment"
          href="/feed"
        />
        {displayPosts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {displayPosts.slice(0, 8).map((post) => (
                <FeedPostCard key={post.id} post={post} hairdresser={post.hairdresser} aspect="portrait" />
              ))}
            </div>
            <div className="text-center mt-6">
              <Link
                href="/feed"
                className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 border border-neutral-200 px-6 py-3 rounded-full hover:border-neutral-900 hover:bg-neutral-50 transition-all"
              >
                Voir toutes les réalisations
                <ArrowRight size={14} />
              </Link>
            </div>
          </>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-neutral-400">Les premières réalisations arrivent bientôt.</p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════
          6. AVANT / APRÈS DU MOMENT — scroll horizontal
      ══════════════════════════════════════════════════════ */}
      {validBeforeAfterPosts.length > 0 && (
        <section className="mt-10 md:mt-14">
          <SectionHeader
            title="Avant / Après du moment"
            subtitle="Les transformations les plus marquantes"
          />
          <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
            {validBeforeAfterPosts.map((post) => (
              <BeforeAfterCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          7. NOUVEAUX TALENTS — coiffeurs récents
      ══════════════════════════════════════════════════════ */}
      {newTalentsHD.length > 0 && (
        <section className="mt-10 md:mt-14">
          <SectionHeader
            title="Nouveaux talents"
            subtitle="Ils viennent de rejoindre CHAIR"
          />
          <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
            {newTalentsHD.map((h) => (
              <HairdresserCardWrapper key={h.id} hairdresser={h} badge="Nouveau" />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          8. POURQUOI CHAIR ? — section confiance (statique)
      ══════════════════════════════════════════════════════ */}
      <section className="mt-14 md:mt-20 px-4 md:px-8 max-w-6xl md:mx-auto">
        <div className="text-center mb-8 md:mb-10">
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-neutral-400 mb-2">
            La différence CHAIR
          </p>
          <h2 className="text-[22px] md:text-[28px] font-bold text-neutral-900 tracking-tight">
            Pourquoi réserver sur CHAIR ?
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {[
            {
              icon: <Award size={20} />,
              title: 'Avis certifiés',
              desc: 'Chaque avis est lié à un vrai rendez-vous. Aucun faux avis possible.',
            },
            {
              icon: <Calendar size={20} />,
              title: 'Réservation instantanée',
              desc: 'Choisissez votre créneau et confirmez en moins d\'une minute.',
            },
            {
              icon: <CheckCircle size={20} />,
              title: 'Coiffeurs vérifiés',
              desc: 'Profils audités, diplômes vérifiés. Vous êtes entre de bonnes mains.',
            },
            {
              icon: <Users size={20} />,
              title: 'Portfolio authentique',
              desc: 'Des vraies réalisations publiées par les coiffeurs eux-mêmes.',
            },
            {
              icon: <Zap size={20} />,
              title: 'Profil portable',
              desc: 'Le coiffeur, pas le salon. Son profil lui appartient où qu\'il soit.',
            },
            {
              icon: <Star size={20} />,
              title: 'Spécialistes identifiés',
              desc: 'Trouvez le spécialiste de votre technique dans votre ville.',
            },
          ].map((item, i) => (
            <div key={i} className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 md:p-5">
              <div className="w-9 h-9 bg-white border border-neutral-200 rounded-xl flex items-center justify-center text-neutral-700 mb-3 shadow-sm">
                {item.icon}
              </div>
              <h3 className="text-[13px] md:text-[14px] font-semibold text-neutral-900 mb-1 leading-tight">
                {item.title}
              </h3>
              <p className="text-[11px] md:text-[12px] text-neutral-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          9. CTA ACQUISITION — visiteurs et coiffeurs
      ══════════════════════════════════════════════════════ */}
      <HomeCTASection
        hairdressersCount={topRatedHD.length}
        postsCount={displayPosts.length}
      />

    </AppShell>
  );
}
