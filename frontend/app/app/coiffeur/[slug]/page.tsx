import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ProfileActions from '@/components/ui/ProfileActions';
import PublicProfileHero from '@/components/ui/PublicProfileHero';
import PublicProfileIdentity from '@/components/ui/PublicProfileIdentity';
import PublicProfileTabs from '@/components/ui/PublicProfileTabs';
import PublicProfilePortfolio from '@/components/ui/PublicProfilePortfolio';
import PublicProfileAbout from '@/components/ui/PublicProfileAbout';
import PublicProfileServices from '@/components/ui/PublicProfileServices';
import PublicProfileReviews from '@/components/ui/PublicProfileReviews';
import PublicProfileStickyCTA from '@/components/ui/PublicProfileStickyCTA';
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
  const canBook          = hairdresser.is_independent || !!hairdresser.booking_url;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-32">

        <PublicProfileHero
          hairdresserId={hairdresser.id}
          bannerUrl={bannerUrl}
        />

        <PublicProfileIdentity hairdresser={hairdresser} avatarUrl={avatarUrl} />

        <div className="px-4 mb-6">
          <ProfileActions
            hairdresserId={hairdresser.id}
            hairdresserName={hairdresser.user.name}
            instagramUrl={hairdresser.instagram_url}
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
                />
              ),
            },
            {
              key: 'about',
              label: 'À propos',
              content: <PublicProfileAbout hairdresser={hairdresser} />,
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
          ]}
          stickyCta={
            <PublicProfileStickyCTA
              slug={hairdresser.slug}
              isIndependent={hairdresser.is_independent}
              bookingUrl={hairdresser.booking_url}
              canBook={canBook}
            />
          }
          hideStickyCtaOnTab="services"
        />

      </div>
    </AppShell>
  );
}
