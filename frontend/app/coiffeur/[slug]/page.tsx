import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import ProfileActions from '@/components/ui/ProfileActions';
import ReviewsSection from '@/components/ui/ReviewsSection';
import PortfolioGrid from '@/components/ui/PortfolioGrid';
import type { ApiHairdresserProfile, ApiPost, ApiServiceCategory, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';
import { MapPin, BadgeCheck, ChevronLeft, Calendar, Briefcase, ExternalLink, Star } from 'lucide-react';
import { LEVEL_STYLES, LEVEL_RING, ringGradientClass } from '@/lib/chairLevel';
import { Crown } from 'lucide-react';

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

function getSalonStatus(h: ApiHairdresserProfile): string {
  if (h.salon) return `Chez ${h.salon.name}`;
  if (h.is_independent) return 'Indépendant(e)';
  return 'Professionnel(le)';
}

export default async function HairdresserProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [hairdresser, posts, serviceCategories] = await Promise.all([
    getHairdresser(slug),
    getHairdresserPosts(slug),
    getHairdresserServices(slug),
  ]);

  if (!hairdresser) notFound();

  const slug_hd         = hairdresser.slug;
  const reviews         = hairdresser.reviews ?? [];
  const avatarUrl       = resolveMediaUrl(hairdresser.user.avatar);
  const bannerUrl       = resolveMediaUrl(hairdresser.banner_image);
  const hasRating       = hairdresser.reviews_count > 0;
  const salonStatus     = getSalonStatus(hairdresser);
  const portfolioPosts  = posts.filter((p) => getAfterImage(p));

  // Spécialité principale (première de la liste)
  const mainSpecialty = hairdresser.specialties?.[0]?.name ?? null;

  // Stats — n'afficher que les valeurs > 0
  const statItems: { label: string; value: string | number }[] = [];
  if (hairdresser.followers_count > 0)
    statItems.push({ label: hairdresser.followers_count === 1 ? 'abonné' : 'abonnés', value: hairdresser.followers_count });
  if (hasRating)
    statItems.push({ label: hairdresser.reviews_count === 1 ? 'avis' : 'avis', value: `${parseFloat(hairdresser.avg_rating).toFixed(1)} ★` });
  if ((hairdresser.visits_count ?? 0) > 0)
    statItems.push({ label: hairdresser.visits_count === 1 ? 'visite' : 'visites', value: hairdresser.visits_count! });

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-24">

        {/* ══════════════════════════════════════
            BANNIÈRE — taller, plein-largeur
        ══════════════════════════════════════ */}
        <div className="relative h-52 md:h-72 w-full overflow-hidden bg-neutral-900">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt={hairdresser.user.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          ) : (
            /* Pas de bannière : fond sombre avec texture */
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

          {/* Bouton retour — mobile */}
          <Link
            href="/"
            className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors md:hidden"
          >
            <ChevronLeft size={19} />
          </Link>
        </div>

        {/* ══════════════════════════════════════
            IDENTITÉ — overlap bannière
        ══════════════════════════════════════ */}
        <div className="px-4 md:px-0">

          {/* Avatar — déborde sur la bannière */}
          {(() => {
            const levelColor = hairdresser.chair_level?.color ?? 'neutral';
            const ring = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;
            return (
              <div className="relative -mt-14 mb-5 z-10 inline-block">
                {/* Outer ring wrapper */}
                <div
                  className={`relative w-24 h-24 md:w-28 md:h-28 rounded-full p-[3px] ${ring.show ? '' : ''}`}
                  style={ring.glow ? { boxShadow: ring.glow } : undefined}
                >
                  {/* Ring gradient ou couleur */}
                  {ring.show && (
                    <div className={`absolute inset-0 rounded-full ${ringGradientClass(levelColor)}`} />
                  )}
                  {/* Avatar avec marge intérieure pour laisser voir le ring */}
                  <div className={`relative rounded-full overflow-hidden bg-neutral-200 ${ring.show ? 'w-[calc(100%-6px)] h-[calc(100%-6px)] m-[3px]' : 'w-full h-full border-4 border-white shadow-md'}`}>
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={hairdresser.user.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                        <span className="text-[26px] font-bold text-white/35 select-none">
                          {hairdresser.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Badge niveau sous la photo */}
                {ring.show && hairdresser.chair_level && (
                  <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-[0.12em] uppercase whitespace-nowrap shadow-sm ${ring.pill}`}>
                    {hairdresser.chair_level.name}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Nom + badge vérifié */}
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-[22px] md:text-[24px] font-bold text-neutral-900 leading-tight">
              {hairdresser.user.name}
            </h1>
            {hairdresser.is_verified && (
              <BadgeCheck size={20} className="text-neutral-900 flex-shrink-0" />
            )}
          </div>

          {/* Spécialité principale */}
          {mainSpecialty && (
            <p className="text-[14px] text-neutral-500 font-medium mb-0.5">
              {mainSpecialty}
            </p>
          )}

          {/* Tagline */}
          {hairdresser.tagline && (
            <p className="text-[13px] text-neutral-400 italic mb-1.5 leading-snug">
              &ldquo;{hairdresser.tagline}&rdquo;
            </p>
          )}

          {/* Niveau CHAIR — badge discret uniquement */}
          {hairdresser.chair_level && hairdresser.chair_level.level > 0 && (() => {
            const ls = LEVEL_STYLES[hairdresser.chair_level!.color] ?? LEVEL_STYLES.neutral;
            return (
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.12em] uppercase border ${ls.bg} ${ls.text}`}>
                  <Crown size={9} strokeWidth={2.5} />
                  {hairdresser.chair_level!.name}
                </span>
              </div>
            );
          })()}

          {/* Ville + statut salon */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-neutral-400 mb-3">
            {hairdresser.city && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {hairdresser.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase size={11} />
              {salonStatus}
            </span>
          </div>

          {/* Stats inline — seulement les valeurs > 0 */}
          {statItems.length > 0 && (
            <div className="flex items-center gap-3 mb-4 text-[13px]">
              {statItems.map((s, i) => (
                <span key={i} className="flex items-center gap-1 text-neutral-600">
                  <span className="font-bold text-neutral-900">{s.value}</span>
                  <span className="text-neutral-400">{s.label}</span>
                  {i < statItems.length - 1 && (
                    <span className="ml-3 w-px h-3 bg-neutral-200 inline-block" />
                  )}
                </span>
              ))}
            </div>
          )}

          {/* ── CTA Réservation ── */}
          <div className="mb-2.5">
            {hairdresser.is_independent ? (
              <Link
                href={`/coiffeur/${slug_hd}/reserver`}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-[14px] hover:bg-neutral-700 transition-colors"
              >
                <Calendar size={15} strokeWidth={2} />
                Réserver un rendez-vous
              </Link>
            ) : hairdresser.booking_url ? (
              <a
                href={hairdresser.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-[14px] hover:bg-neutral-700 transition-colors"
              >
                <ExternalLink size={15} strokeWidth={2} />
                Réserver au salon
              </a>
            ) : (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 bg-neutral-100 text-neutral-400 font-semibold py-3.5 rounded-xl text-[14px] cursor-not-allowed"
              >
                <Calendar size={15} strokeWidth={2} />
                Réservation indisponible
              </button>
            )}
          </div>

          {/* ── S'abonner / Sauvegarder / Partager ── */}
          <div className="mb-2">
            <ProfileActions
              hairdresserId={hairdresser.id}
              hairdresserName={hairdresser.user.name}
              instagramUrl={hairdresser.instagram_url}
              initialFollowersCount={hairdresser.followers_count}
            />
          </div>

        </div>

        {/* ══════════════════════════════════════
            PORTFOLIO — élément principal
        ══════════════════════════════════════ */}
        <section className="mt-7">
          <div className="px-4 md:px-0 flex items-baseline justify-between mb-3">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400">
              Portfolio
            </p>
            {portfolioPosts.length > 0 && (
              <span className="text-[11px] text-neutral-400">
                {portfolioPosts.length} réalisation{portfolioPosts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <PortfolioGrid posts={portfolioPosts} />
        </section>

        {/* ══════════════════════════════════════
            PRÉSENTATION — bio + spécialités
        ══════════════════════════════════════ */}
        {(hairdresser.user.bio || hairdresser.specialties.length > 0) && (
          <div className="px-4 md:px-0 mt-8 space-y-6">

            {hairdresser.user.bio && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400 mb-2.5">
                  À propos
                </p>
                <p className="text-[14px] text-neutral-600 leading-relaxed">
                  {hairdresser.user.bio}
                </p>
              </div>
            )}

            {hairdresser.specialties.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400 mb-3">
                  Spécialités
                </p>
                <div className="flex flex-wrap gap-2">
                  {hairdresser.specialties.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/rechercher?specialty=${s.slug}`}
                      className="text-[11px] font-semibold tracking-wide uppercase bg-neutral-900 text-white px-3 py-1.5 rounded-full hover:bg-neutral-700 transition-colors"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════
            SERVICES — après le contenu visuel
        ══════════════════════════════════════ */}
        {serviceCategories.length > 0 && (
          <div className="px-4 md:px-0 mt-8">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400 mb-4">
              Services
            </p>
            <div className="space-y-4">
              {serviceCategories.map((cat) => {
                const active = (cat.services ?? []).filter((s) => s.is_active);
                if (active.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      {cat.name}
                    </p>
                    <div className="bg-neutral-50 rounded-2xl overflow-hidden divide-y divide-neutral-100">
                      {active.map((svc) => (
                        <div key={svc.id} className="flex items-center justify-between px-4 py-3.5">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-[14px] font-medium text-neutral-900 leading-snug">
                              {svc.name}
                            </p>
                            {svc.description && (
                              <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug">
                                {svc.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {svc.duration_minutes != null && (
                              <span className="text-[12px] text-neutral-400">
                                {svc.duration_minutes} min
                              </span>
                            )}
                            {svc.price != null && parseFloat(String(svc.price)) > 0 ? (
                              <span className="text-[14px] font-semibold text-neutral-900">
                                {parseFloat(String(svc.price)).toFixed(0)} €
                              </span>
                            ) : !hairdresser.is_independent ? (
                              <span className="text-[11px] text-neutral-400 italic">Au salon</span>
                            ) : null}
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

        {/* ══════════════════════════════════════
            AVIS — preuve sociale
        ══════════════════════════════════════ */}
        <div className="px-4 md:px-0 mt-10">

          {/* En-tête avis avec note globale bien visible */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400">
              Avis clients
            </p>
            {hasRating && (
              <div className="flex items-center gap-1.5">
                <Star size={13} className="fill-neutral-900 stroke-neutral-900" />
                <span className="text-[14px] font-bold text-neutral-900">
                  {parseFloat(hairdresser.avg_rating).toFixed(1)}
                </span>
                <span className="text-[12px] text-neutral-400">
                  ({hairdresser.reviews_count})
                </span>
              </div>
            )}
          </div>

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
