'use client';

import BookingCTA from './BookingCTA';
import { useCookieBannerVisible } from './CookieBanner';

interface Props {
  slug: string;
  isIndependent: boolean;
  bookingUrl: string | null;
  canBook: boolean;
}

// CTA sticky mobile — visible uniquement si une réservation est possible.
// Respecte la bottom nav (bottom-[66px]) et la safe-area.
export default function PublicProfileStickyCTA({ slug, isIndependent, bookingUrl, canBook }: Props) {
  // Le bandeau cookies (CookieBanner, monté globalement, z-[9998]) doit
  // rester au-dessus de tout pour rester actionnable — donc c'est ce CTA
  // qui se décale au-dessus de lui tant qu'il est affiché, plutôt que
  // l'inverse (sinon le bandeau masque le bouton de réservation, ou le CTA
  // masque les boutons Accepter/Refuser si on inversait juste le z-index).
  const cookieBannerVisible = useCookieBannerVisible();

  if (!canBook) return null;

  return (
    <div
      className={`fixed left-0 right-0 z-40 md:hidden pointer-events-none transition-[bottom] duration-200 ${
        cookieBannerVisible ? 'bottom-[230px]' : 'bottom-[66px]'
      }`}
    >
      {/* Voile blanc court : il doit juste détacher le bouton du contenu qui
          défile dessous, pas peindre un dégradé sur un tiers de l'écran. */}
      <div className="bg-gradient-to-t from-white via-white to-transparent pt-6 pb-3 px-4">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <BookingCTA slug={slug} isIndependent={isIndependent} bookingUrl={bookingUrl ?? null} />
        </div>
      </div>
    </div>
  );
}
