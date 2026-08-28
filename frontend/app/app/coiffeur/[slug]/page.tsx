import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ProfileActions from '@/components/ui/ProfileActions';
import PublicProfileHero from '@/components/ui/PublicProfileHero';
import PublicProfileIdentity from '@/components/ui/PublicProfileIdentity';
import PublicProfileTabs from '@/components/ui/PublicProfileTabs';
import PublicProfilePortfolio from '@/components/ui/PublicProfilePortfolio';
import PublicProfileAbout from '@/components/ui/PublicProfileAbout';
import LocationMapCard from '@/components/ui/LocationMapCard';
import PublicProfileServices from '@/components/ui/PublicProfileServices';
import PublicProfileReviews from '@/components/ui/PublicProfileReviews';
import PublicProfileBadges from '@/components/ui/PublicProfileBadges';
import PublicProfileStickyCTA from '@/components/ui/PublicProfileStickyCTA';
import BookingResume from '@/components/ui/BookingResume';
import { ContentMenu } from '@/components/ui/ReportSheet';
import BlockedProfileNotice from '@/components/ui/BlockedProfileNotice';
import ScrollToTopOnMount from '@/components/ui/ScrollToTopOnMount';
import type { ApiHairdresserProfile, ApiPost, ApiServiceCategory, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';

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

  const reviews        = hairdresser.reviews ?? [];
  const avatarUrl       = resolveMediaUrl(hairdresser.user.avatar);
  const bannerUrl        = resolveMediaUrl(hairdresser.banner_image);
  const portfolioPosts  = posts.filter((p) => getAfterImage(p));
  // Un salarié est réservable dès que SON salon a un agenda en ligne, même
  // s'il n'a lui-même rien saisi : c'est le salon qui détient l'abonnement.
  // Sans cette retombée, le bouton flottant restait masqué et le seul point
  // d'entrée était noyé dans l'onglet Services.
  const canBook          = hairdresser.is_independent
    || !!hairdresser.booking_url
    || !!hairdresser.salon?.booking_url;

  return (
    <AppShell>
      {/* PAS d'overflow-x-clip/hidden ici : sur Safari iOS, un overflow-x
          non-visible sur un ancêtre casse la barre d'onglets sticky (bug
          constaté en réel par Julien). L'anti-débordement horizontal est
          garanti à la source : break-words + overflow-wrap:anywhere sur tout
          contenu saisi par l'utilisateur (nom, accroche, bio). */}
      <div className="max-w-2xl mx-auto pb-32">

        <ScrollToTopOnMount />

        {/* Reprise d'une réservation interrompue par la connexion — rouvre la
            feuille de réservation si un intent frais existe pour ce coiffeur.
            Réservé aux indépendants : les salons réservent via bookingUrl externe. */}
        {hairdresser.is_independent && <BookingResume slug={hairdresser.slug} />}

        <PublicProfileHero
          hairdresserId={hairdresser.id}
          bannerUrl={bannerUrl}
        />

        <PublicProfileIdentity hairdresser={hairdresser} avatarUrl={avatarUrl} />

        {/* Effet visible du blocage sur une fiche ouverte par lien direct
            (App Store Review Guideline 1.2). Ne rend rien si le visiteur
            n'a pas bloqué ce compte. */}
        <BlockedProfileNotice
          authorUserId={hairdresser.user.id}
          authorName={hairdresser.user.name}
        />

        {/* Le menu "…" porte le signalement et le blocage (App Store Review
            Guideline 1.2 — UGC). Il est posé à côté de la rangée d'actions et
            non caché dans un sous-écran : l'action doit être trouvable sans
            chercher. Voir components/ui/ReportSheet.tsx. */}
        <div className="px-4 mb-6 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <ProfileActions
              hairdresserId={hairdresser.id}
              hairdresserName={hairdresser.user.name}
              instagramUrl={hairdresser.instagram_url}
              tagline={hairdresser.tagline}
              city={hairdresser.city}
            />
          </div>
          <ContentMenu
            type="profile"
            contentId={hairdresser.id}
            authorUserId={hairdresser.user.id}
            authorName={hairdresser.user.name}
            className="flex-shrink-0 bg-neutral-50"
            label={`Signaler ou bloquer ${hairdresser.user.name}`}
          />
        </div>

        {/* Ordre des onglets calé sur la décision produit : ce qui fait
            réserver d'abord (réalisations, puis prestations), la biographie et
            le salon ensuite, les avis en dernier. "À propos" arrivait en
            deuxième position et repoussait les prestations — c'est-à-dire le
            seul onglet depuis lequel on peut effectivement réserver. */}
        <PublicProfileTabs
          defaultTab="portfolio"
          tabs={[
            {
              key: 'portfolio',
              label: 'Portfolio',
              count: portfolioPosts.length,
              content: <PublicProfilePortfolio posts={portfolioPosts} />,
            },
            {
              key: 'services',
              label: 'Services',
              content: (
                <PublicProfileServices
                  slug={hairdresser.slug}
                  categories={serviceCategories}
                  isIndependent={hairdresser.is_independent}
                  bookingUrl={hairdresser.booking_url}
                  salonBookingUrl={hairdresser.salon?.booking_url ?? null}
                  salonPhone={hairdresser.salon?.phone ?? null}
                  specialtyHighlights={hairdresser.specialty_highlights ?? []}
                />
              ),
            },
            {
              key: 'about',
              label: 'À propos',
              // La carte vient APRÈS la biographie : on lit d'abord qui est la
              // personne, on regarde ensuite où elle travaille. L'inverse
              // ferait passer un détail pratique avant l'essentiel.
              content: (
                <>
                  <PublicProfileAbout hairdresser={hairdresser} />
                  <LocationMapCard
                    latitude={hairdresser.latitude}
                    longitude={hairdresser.longitude}
                    placeName={hairdresser.salon?.name ?? null}
                    addressLine={[hairdresser.work_address, hairdresser.salon?.city ?? hairdresser.city].filter(Boolean).join(' · ') || null}
                    markerInitial={(hairdresser.user?.name ?? '?').charAt(0).toUpperCase()}
                    markerKey={`hairdresser-${hairdresser.id}`}
                    phone={hairdresser.salon?.phone ?? null}
                    className="px-4 pt-2 pb-6"
                  />
                </>
              ),
            },
            {
              key: 'reviews',
              label: 'Avis',
              count: hairdresser.reviews_count,
              content: (
                <PublicProfileReviews
                  hairdresserId={hairdresser.id}
                  hairdresserUserId={hairdresser.user.id}
                  reviews={reviews}
                  avgRating={hairdresser.avg_rating}
                  reviewsCount={hairdresser.reviews_count}
                />
              ),
            },
            {
              key: 'badges',
              label: 'Badges',
              count: hairdresser.chair_badges_all?.length ?? 0,
              content: (
                <PublicProfileBadges
                  badges={hairdresser.chair_badges_all ?? []}
                  level={hairdresser.chair_level}
                  coiffeurName={hairdresser.user.name}
                />
              ),
            },
          ]}
          stickyCta={
            <PublicProfileStickyCTA
              slug={hairdresser.slug}
              isIndependent={hairdresser.is_independent}
              bookingUrl={hairdresser.booking_url ?? hairdresser.salon?.booking_url ?? null}
              canBook={canBook}
            />
          }
          hideStickyCtaOnTab="services"
        />

      </div>
    </AppShell>
  );
}
