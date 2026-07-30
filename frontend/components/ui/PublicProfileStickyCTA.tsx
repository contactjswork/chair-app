import BookingCTA from './BookingCTA';

interface Props {
  slug: string;
  isIndependent: boolean;
  bookingUrl: string | null;
  canBook: boolean;
}

// CTA sticky mobile — visible uniquement si une réservation est possible.
// Respecte la bottom nav (bottom-[66px]) et la safe-area.
export default function PublicProfileStickyCTA({ slug, isIndependent, bookingUrl, canBook }: Props) {
  if (!canBook) return null;

  return (
    <div className="fixed bottom-[66px] left-0 right-0 z-40 md:hidden pointer-events-none">
      {/* Voile blanc court : il doit juste détacher le bouton du contenu qui
          défile dessous, pas peindre un dégradé sur un tiers de l'écran. */}
      <div className="bg-gradient-to-t from-white via-white to-transparent pt-6 pb-3 px-4 pointer-events-auto">
        <div className="max-w-2xl mx-auto">
          <BookingCTA slug={slug} isIndependent={isIndependent} bookingUrl={bookingUrl ?? null} />
        </div>
      </div>
    </div>
  );
}
