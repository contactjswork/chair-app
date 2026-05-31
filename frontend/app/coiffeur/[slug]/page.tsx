import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import ProfileActions from '@/components/ui/ProfileActions';
import ReviewsSection from '@/components/ui/ReviewsSection';
import StarRating from '@/components/ui/StarRating';
import type { ApiHairdresserProfile, ApiPost, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';
import { MapPin, BadgeCheck, ChevronLeft, Calendar, Briefcase, ExternalLink } from 'lucide-react';

const API = 'http://localhost:8000/api';

async function getHairdresser(slug: string): Promise<ApiHairdresserProfile | null> {
  const res = await fetch(`${API}/hairdressers/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function getHairdresserPosts(slug: string): Promise<ApiPost[]> {
  const res = await fetch(`${API}/hairdressers/${slug}/posts`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data: PaginatedResponse<ApiPost> = await res.json();
  return data.data;
}

// ── Statut salon ─────────────────────────────────────────────────────
function getSalonStatus(hairdresser: ApiHairdresserProfile): string {
  if (hairdresser.salon) return `Chez ${hairdresser.salon.name}`;
  if (hairdresser.is_independent) return 'Indépendant(e)';
  return 'Professionnel(le)';
}

// ── Item portfolio (grille dense) ────────────────────────────────────
function PortfolioItem({ post }: { post: ApiPost }) {
  const imageUrl = resolveMediaUrl(getAfterImage(post));
  if (!imageUrl) return null;
  return (
    <Link href={`/realisation/${post.id}`} className="relative aspect-square overflow-hidden bg-neutral-100 group block">
      <Image
        src={imageUrl}
        alt={post.description || 'Réalisation'}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-500"
        sizes="(max-width: 768px) 33vw, 25vw"
      />
      {post.specialty && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <span className="text-[10px] text-white font-semibold tracking-[0.12em] uppercase leading-tight">
            {post.specialty.name}
          </span>
        </div>
      )}
      {/* Indicateur avant/après */}
      {post.type === 'before_after' && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] text-white/80 font-medium bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
            Avant/Après
          </span>
        </div>
      )}
    </Link>
  );
}

export default async function HairdresserProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [hairdresser, posts] = await Promise.all([
    getHairdresser(slug),
    getHairdresserPosts(slug),
  ]);

  if (!hairdresser) notFound();

  const hairdresserSlug = hairdresser.slug;
  const reviews = hairdresser.reviews ?? [];
  const avatarUrl = resolveMediaUrl(hairdresser.user.avatar);
  const bannerUrl = resolveMediaUrl(hairdresser.banner_image);
  const hasRating = hairdresser.reviews_count > 0;
  const salonStatus = getSalonStatus(hairdresser);

  const stats = [
    { label: 'Abonnés', value: hairdresser.followers_count },
    { label: 'Avis',    value: hairdresser.reviews_count },
    { label: 'Note',    value: hasRating ? hairdresser.avg_rating : '—' },
    { label: 'Visites', value: '—' },
  ];

  const portfolioPosts = posts.filter((p) => getAfterImage(p));

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-16">

        {/* ── Bannière ── */}
        <div className="relative h-48 md:h-64 w-full overflow-hidden md:rounded-2xl md:mx-0 md:mt-4 bg-neutral-900">
          {bannerUrl && (
            <Image
              src={bannerUrl}
              alt={hairdresser.user.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

          {/* Retour mobile */}
          <Link
            href="/"
            className="absolute top-4 left-4 flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors md:hidden"
          >
            <ChevronLeft size={18} />
          </Link>
        </div>

        <div className="px-4 md:px-0">

          {/* ── Avatar + Nom ── */}
          <div className="flex items-end justify-between -mt-12 mb-5 relative z-10">
            <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-md flex-shrink-0 bg-neutral-200 overflow-hidden">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={hairdresser.user.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-300 flex items-center justify-center">
                  <span className="text-3xl font-bold text-neutral-500">
                    {hairdresser.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Identité ── */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-neutral-900 leading-tight">{hairdresser.user.name}</h1>
              {hairdresser.is_verified && (
                <BadgeCheck size={20} className="text-neutral-900 flex-shrink-0" />
              )}
            </div>

            {hairdresser.tagline && (
              <p className="text-sm text-neutral-500 italic mb-2">"{hairdresser.tagline}"</p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
              {hairdresser.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} />
                  {hairdresser.city}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Briefcase size={13} />
                {salonStatus}
              </span>
            </div>
          </div>

          {/* ── CTA principal — Réservation dynamique ── */}
          <div className="mb-3">
            {hairdresser.is_independent ? (
              /* Indépendant → formulaire CHAIR */
              <Link
                href={`/coiffeur/${hairdresserSlug}/reserver`}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-sm hover:bg-neutral-700 transition-colors"
              >
                <Calendar size={16} strokeWidth={2} />
                Demander un rendez-vous
              </Link>
            ) : hairdresser.booking_url ? (
              /* Salarié avec lien externe */
              <a
                href={hairdresser.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-sm hover:bg-neutral-700 transition-colors"
              >
                <ExternalLink size={16} strokeWidth={2} />
                Réserver au salon
              </a>
            ) : (
              /* Salarié sans lien */
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 bg-neutral-100 text-neutral-400 font-semibold py-3.5 rounded-xl text-sm cursor-not-allowed"
              >
                <Calendar size={16} strokeWidth={2} />
                Réservation via le salon
              </button>
            )}
          </div>

          {/* ── Actions secondaires : Suivre / Sauvegarder / Instagram ── */}
          <div className="mb-6">
            <ProfileActions
              hairdresserId={hairdresser.id}
              instagramUrl={hairdresser.instagram_url}
              initialFollowersCount={hairdresser.followers_count}
            />
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {stats.map(({ label, value }) => (
              <div key={label} className="bg-neutral-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-neutral-900 leading-none mb-1">{value}</p>
                <p className="text-[10px] text-neutral-400 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Signaux de confiance ── */}
          {(hairdresser.is_verified || hairdresser.years_experience || portfolioPosts.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {hairdresser.is_verified && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-full">
                  <BadgeCheck size={13} />
                  Profil vérifié
                </span>
              )}
              {hairdresser.years_experience && hairdresser.years_experience > 0 && (
                <span className="text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-full">
                  {hairdresser.years_experience} ans d'expérience
                </span>
              )}
              {portfolioPosts.length > 0 && (
                <span className="text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-full">
                  Portfolio actif
                </span>
              )}
              {hairdresser.reviews_count >= 3 && (
                <span className="text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-full">
                  {hairdresser.reviews_count} avis clients
                </span>
              )}
            </div>
          )}

          {/* ── Bio ── */}
          {hairdresser.user.bio && (
            <p className="text-sm text-neutral-600 leading-relaxed mb-6">
              {hairdresser.user.bio}
            </p>
          )}

          {/* ── Spécialités ── */}
          {hairdresser.specialties.length > 0 && (
            <div className="mb-8">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                Spécialités
              </p>
              <div className="flex flex-wrap gap-2">
                {hairdresser.specialties.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/rechercher?specialty=${s.slug}`}
                    className="text-xs font-semibold tracking-wide uppercase bg-neutral-900 text-white px-3 py-1.5 rounded-full hover:bg-neutral-700 transition-colors"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Portfolio ── */}
        {portfolioPosts.length > 0 && (
          <section className="mb-8">
            <div className="px-4 md:px-0 flex items-baseline justify-between mb-3">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                Portfolio
              </p>
              <span className="text-[11px] text-neutral-400">
                {portfolioPosts.length} réalisation{portfolioPosts.length > 1 ? 's' : ''}
              </span>
            </div>
            {/* Grille dense 3 colonnes — style Instagram */}
            <div className="grid grid-cols-3 gap-px bg-neutral-100 md:rounded-xl overflow-hidden">
              {portfolioPosts.map((post) => (
                <PortfolioItem key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* ── Avis ── */}
        <div className="px-4 md:px-0">
          {hasRating && (
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={parseFloat(hairdresser.avg_rating)} size={16} />
              <span className="text-sm font-bold text-neutral-900">{hairdresser.avg_rating}</span>
              <span className="text-sm text-neutral-400">· {hairdresser.reviews_count} avis</span>
            </div>
          )}

          <ReviewsSection
            hairdresserId={hairdresser.id}
            hairdresserUserId={hairdresser.user.id}
            initialReviews={reviews}
            avgRating={hairdresser.avg_rating}
            reviewsCount={hairdresser.reviews_count}
          />
        </div>

      </div>
    </AppShell>
  );
}
