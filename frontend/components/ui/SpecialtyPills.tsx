'use client';

import Link from 'next/link';
import type { ApiSpecialty } from '@/lib/types';

export default function SpecialtyPills({ specialties }: { specialties: ApiSpecialty[] }) {
  if (!specialties.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar pt-1">
      <Link
        href="/app/recherche"
        className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold bg-neutral-900 text-white whitespace-nowrap"
      >
        Tout voir
      </Link>
      {specialties.slice(0, 12).map((s) => (
        <Link
          key={s.slug}
          href={`/app/recherche?specialty=${s.slug}`}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors whitespace-nowrap"
        >
          {s.name}
        </Link>
      ))}
    </div>
  );
}
