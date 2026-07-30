'use client';

import { useState } from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import BookingSheet from './BookingSheet';
import { PrimaryButton } from './Button';

interface Props {
  slug: string;
  isIndependent: boolean;
  bookingUrl: string | null;
}

// Le CTA de réservation passe par PrimaryButton comme le reste de l'app.
// Il inventait auparavant sa propre cote (py-4, rounded-2xl, text-[15px]) et
// surtout un `shadow-lg` : une ombre portée large et sombre sur un bouton
// noir, c'est exactement l'effet décoratif que la charte exclut. L'élévation
// est déjà assurée par le voile blanc du conteneur sticky.
export default function BookingCTA({ slug, isIndependent, bookingUrl }: Props) {
  const [open, setOpen] = useState(false);

  if (!isIndependent) {
    return (
      <PrimaryButton
        fullWidth
        href={bookingUrl!}
        target="_blank"
        icon={<ExternalLink size={16} strokeWidth={2} />}
      >
        Réserver au salon
      </PrimaryButton>
    );
  }

  return (
    <>
      <PrimaryButton
        fullWidth
        onClick={() => setOpen(true)}
        icon={<Calendar size={16} strokeWidth={2} />}
      >
        Réserver un rendez-vous
      </PrimaryButton>
      <BookingSheet slug={slug} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
