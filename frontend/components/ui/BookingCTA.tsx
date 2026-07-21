'use client';

import { useState } from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import BookingSheet from './BookingSheet';

interface Props {
  slug: string;
  isIndependent: boolean;
  bookingUrl: string | null;
}

export default function BookingCTA({ slug, isIndependent, bookingUrl }: Props) {
  const [open, setOpen] = useState(false);

  if (!isIndependent) {
    return (
      <a
        href={bookingUrl!}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-neutral-900 text-white font-semibold py-4 rounded-2xl text-[15px] shadow-lg active:scale-[0.98] transition-transform"
      >
        <ExternalLink size={16} strokeWidth={2} />
        Réserver au salon
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full bg-neutral-900 text-white font-semibold py-4 rounded-2xl text-[15px] shadow-lg active:scale-[0.98] transition-transform"
      >
        <Calendar size={16} strokeWidth={2} />
        Réserver un rendez-vous
      </button>
      <BookingSheet slug={slug} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
