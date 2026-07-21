import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import ProfileActions from '@/components/ui/ProfileActions';
import ReviewsCompact from '@/components/ui/ReviewsCompact';
import PortfolioGrid from '@/components/ui/PortfolioGrid';
import BioExpander from '@/components/ui/BioExpander';
import type { ApiHairdresserProfile, ApiPost, ApiServiceCategory, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';
import { MapPin, BadgeCheck, Star, Clock } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';
import BookingCTA from '@/components/ui/BookingCTA';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

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

async function getHairdresserServices(slug: string): Promise<ApiServiceCategory[]> {
  try {
    const res = await fetch(`${API}/hairdressers/${slug}/services`, { cache: 'no-store' });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

function getSalonStatus(h: ApiHairdresserProfile): { text: string; link: string | null } {
  if (h.salon) return { text: `Chez ${h.salon.name}`, link: `/app/salon/${h.salon.slug}` };
  if (h.is_independent) return { text: 'Indépendant(e)', link: null };
  return { text: '', link: null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await getHairdresser(slug);
  if (!h) return { title: 'Coiffeur — CHAIR' };
  const specialty = h.specialties?.[0]?.name;
  const title = [h.user.name, specialty, h.city].filter(Boolean).join(' · ') + ' — CHAIR';
  const description = h.tagline
    ? `${h.user.name}${h.city ? ` à ${h.city}` : ''}. "${h.tagline}" — CHAIR`
    : `${h.user.name}${h.city ? ` à ${h.city}` : ''}. Portfolios réels, avis certifiés sur CHAIR.`;
  const ogImage = resolveMediaUrl(h.banner_image) ?? resolveMediaUrl(h.user?.avatar) ?? null;
  return {
    title, description,
    openGraph: { title, description, type: 'profile' as const, ...(ogImage ? { images: [{ url: ogImage }] } : {}) },
  };
}

export default async function HairdresserProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [hairdresser, posts, serviceCategories] = await Promise.all([
    getHairdresser(slug),
    getHairdresserPosts(slug),
    getHairdresserServices(slug),
  ]);

  if (!hairdresser) notFound();

  const slug_hd       = hairdresser.slug;
  const reviews       = hairdresser.reviews ?? [];
  const avatarUrl     = resolveMediaUrl(hairdresser.user.avatar);
  const bannerUrl     = resolveMediaUrl(hairdresser.banner_image);
  const hasRating     = hairdresser.reviews_count > 0;
  const salonStatus   = getSalonStatus(hairdresser);
  const portfolioPosts = posts.filter((p) => getAfterImage(p));
  const mainSpecialty = hairdresser.specialties?.[0]?.name ?? null;
  const yearsExp      = hairdresser.years_experience;
  const canBook       = hairdresser.is_independent || !!hairdresser.booking_url;

  const metaLine = [
    mainSpecialty,
    hairdresser.city,
    yearsExp ? `${yearsExp} ans` : null,
    salonStatus.text || null,
  ].filter(Boolean).join('  ·  ');

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-32">

        {/* ── HERO ── */}
        <div className="relative w-full overflow-hidden bg-neutral-900" style={{ height: '260px' }}>
          {bannerUrl ? (
            <Image src={bannerUrl} alt={hairdresser.user.name} fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/20" />
          <BackButton fallbackHref="/app/recherche" />
        </div>

        {/* ── IDENTITÉ ── */}
        <div className="px-4">

          {/* Avatar + rating */}
          <div className="flex items-end justify-between -mt-12 mb-5 relative z-10">
            <div className="relative w-[82px] h-[82px] rounded-full overflow-hidden bg-neutral-200 border-4 border-white shadow-md flex-shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={hairdresser.user.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <span className="text-[24px] font-bold text-white/40">
                    {hairdresser.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {hasRating && (
              <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-sm border border-neutral-100 mb-1">
                <Star size={13} className="fill-amber-400 stroke-none" />
                <span className="text-[15px] font-bold text-neutral-900">
                  {parseFloat(hairdresser.avg_rating).toFixed(1)}
                </span>
                <span className="text-[12px] text-neutral-400">({hairdresser.reviews_count})</span>
              </div>
            )}
          </div>

          {/* Nom */}
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[22px] font-bold text-neutral-900 leading-tight">{hairdresser.user.name}</h1>
            {hairdresser.is_verified && <BadgeCheck size={19} className="text-neutral-900 flex-shrink-0" />}
          </div>

          {/* Méta : spécialité · ville · expérience */}
          {metaLine && (
            <p className="text-[13px] text-neutral-400 mb-2 leading-snug flex items-center gap-1 flex-wrap">
              {hairdresser.city && <MapPin size={11} className="flex-shrink-0" />}
              {metaLine}
            </p>
          )}

          {/* Tagline */}
          {hairdresser.tagline && (
            <p className="text-[13px] text-neutral-500 italic mb-4 leading-snug">
              {hairdresser.tagline}
            </p>
          )}

          {/* Actions : S'abonner, favoris, partage */}
          <ProfileActions
            hairdresserId={hairdresser.id}
            hairdresserName={hairdresser.user.name}
            instagramUrl={null}
            initialFollowersCount={hairdresser.followers_count}
          />
        </div>

        {/* ── PORTFOLIO ── */}
        {portfolioPosts.length > 0 && (
          <section className="mt-8">
            <div className="px-4 flex items-baseline justify-between mb-3">
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400">Portfolio</p>
              <span className="text-[11px] text-neutral-400">
                {portfolioPosts.length} réalisation{portfolioPosts.length > 1 ? 's' : ''}
              </span>
            </div>
            <PortfolioGrid posts={portfolioPosts} />
          </section>
        )}

        {/* ── BIO + SPÉCIALITÉS ── */}
        {(hairdresser.user.bio || hairdresser.specialties.length > 0) && (
          <div className="px-4 mt-8">
            {hairdresser.user.bio && (
              <div className="mb-4">
                <BioExpander bio={hairdresser.user.bio} />
              </div>
            )}
            {hairdresser.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hairdresser.specialties.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/app/recherche?specialty=${s.slug}`}
                    className="text-[11px] font-semibold tracking-wide uppercase bg-neutral-900 text-white px-3 py-1.5 rounded-full hover:bg-neutral-700 transition-colors"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PRESTATIONS ── */}
        {serviceCategories.length > 0 && (
          <div className="px-4 mt-8">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400 mb-4">Prestations</p>
            <div className="space-y-5">
              {serviceCategories.map((cat) => {
                const active = (cat.services ?? []).filter((s) => s.is_active);
                if (active.length === 0) return null;
                return (
                  <div key={cat.id}>
                    {cat.name && (
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2">{cat.name}</p>
                    )}
                    <div className="bg-neutral-50 rounded-2xl overflow-hidden divide-y divide-neutral-100">
                      {active.map((svc) => (
                        <div key={svc.id} className="flex items-center gap-3 px-4 py-3.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-neutral-900 leading-snug">{svc.name}</p>
                            {svc.description && (
                              <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug line-clamp-1">{svc.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {svc.duration_minutes != null && (
                              <span className="flex items-center gap-1 text-[12px] text-neutral-400">
                                <Clock size={11} />{svc.duration_minutes} min
                              </span>
                            )}
                            {svc.price != null && parseFloat(String(svc.price)) > 0 && (
                              <span className="text-[15px] font-bold text-neutral-900">{parseFloat(String(svc.price)).toFixed(0)} €</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AVIS ── */}
        <ReviewsCompact
          hairdresserId={hairdresser.id}
          hairdresserUserId={hairdresser.user.id}
          initialReviews={reviews}
          avgRating={hairdresser.avg_rating}
          reviewsCount={hairdresser.reviews_count}
        />

      </div>

      {/* ── CTA STICKY ── */}
      {canBook && (
        <div className="fixed bottom-[66px] left-0 right-0 z-40 md:hidden pointer-events-none">
          <div className="bg-gradient-to-t from-white via-white/96 to-transparent pt-5 pb-3 px-4 pointer-events-auto">
            <BookingCTA
              slug={slug_hd}
              isIndependent={hairdresser.is_independent}
              bookingUrl={hairdresser.booking_url ?? null}
            />
          </div>
        </div>
      )}

    </AppShell>
  );
}
