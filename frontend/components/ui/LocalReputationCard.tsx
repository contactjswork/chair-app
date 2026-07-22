'use client';

import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';
import type { ApiSpecialtyProgress } from '@/lib/types';

export default function LocalReputationCard({ specialties, city }: { specialties: ApiSpecialtyProgress[]; city: string | null }) {
  const ranked = specialties
    .filter((s) => s.local_rank != null && (s.local_total ?? 0) >= 2)
    .sort((a, b) => (a.local_rank ?? 999) - (b.local_rank ?? 999));

  if (!city || ranked.length === 0) return null;

  return (
    <Link href="/app/classements" className="block bg-white rounded-2xl border border-neutral-100 p-5 hover:border-neutral-200 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={13} className="text-neutral-400" />
        <p className="text-sm font-bold text-neutral-900">{city}</p>
        <ChevronRight size={14} className="text-neutral-300 ml-auto" />
      </div>
      <div className="space-y-2">
        {ranked.map((s) => (
          <div key={s.specialty_id} className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">{s.specialty_name}</span>
            <span className="font-bold text-neutral-900">#{s.local_rank}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}
