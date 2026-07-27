import BookingCTA from './BookingCTA';

interface Props {
  slug: string;
  isIndependent: boolean;
  bookingUrl: string | null;
  canBook: boolean;
}

// CTA sticky mobile — visible uniquement si une réservation est possible.
// Respecte la bottom nav (bottom-[66px]) et la safe-area (gérée par BookingCTA/BookingSheet).
export default function PublicProfileStickyCTA({ slug, isIndependent, bookingUrl, canBook }: Props) {
  if (!canBook) return null;

  return (
    <div className="fixed bottom-[66px] left-0 right-0 z-40 md:hidden pointer-events-none">
      <div className="bg-gradient-to-t from-white via-white/96 to-transparent pt-5 pb-3 px-4 pointer-events-auto">
        <BookingCTA slug={slug} isIndependent={isIndependent} bookingUrl={bookingUrl ?? null} />
      </div>
    </div>
  );
}
