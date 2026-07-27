'use client';

import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';
import type { ApiSpecialtyProgress } from '@/lib/types';

export default function LocalReputationCard({ specialties, city }: { specialties: ApiSpecialtyProgress[]; city: string | null }) {
  if (!city) return null;

  const ranked = specialties
    .filter((s) => s.local_rank != null && (s.local_total ?? 0) >= 2)
    .sort((a, b) => (a.local_rank ?? 999) - (b.local_rank ?? 999));

  // Pas encore classé mais déjà de l'activité réelle (score > 0) — encourage
  // plutôt que de disparaître silencieusement, sans rien inventer.
  const hasActivity = specialties.some((s) => s.score > 0);
  if (ranked.length === 0 && !hasActivity) return null;

  return (
    <Link href="/app/classements" className="block bg-white rounded-2xl border border-neutral-100 p-5 hover:border-neutral-200 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={13} className="text-neutral-400" />
        <p className="text-sm font-bold text-neutral-900">{city}</p>
        <ChevronRight size={14} className="text-neutral-300 ml-auto" />
      </div>
      {ranked.length > 0 ? (
        <div className="space-y-2.5">
          {ranked.map((s) => (
            <div key={s.specialty_id} className="flex items-center justify-between text-sm gap-3">
              <span className="text-neutral-600 truncate">{s.specialty_name}</span>
              <span className="text-right flex-shrink-0">
                <span className="font-bold text-neutral-900">#{s.local_rank}</span>
                {!!s.points_to_next && (
                  <span className="block text-[11px] text-neutral-400 font-normal">
                    {s.points_to_next} pt{s.points_to_next > 1 ? 's' : ''} avant la {(s.local_rank ?? 1) - 1}e place
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-neutral-400 leading-relaxed">
          Publiez quelques réalisations et récoltez vos premiers avis pour entrer dans le classement local.
        </p>
      )}
    </Link>
  );
}
