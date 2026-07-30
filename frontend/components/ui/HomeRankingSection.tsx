'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MapPin, Trophy } from 'lucide-react';
import { getStoredLocation } from '@/hooks/useGeolocation';
import { resolveMediaUrl } from '@/lib/types';
import { SectionHeader } from './HomeGeoStrips';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export interface RankedEntry {
  rank: number;
  id: number;
  slug: string;
  name: string;
  avatar: string | null;
  city: string | null;
  specialty: string | null;
  avg_rating: number;
  reviews_count: number;
  is_verified: boolean;
}

const RANK_TONE: Record<number, string> = {
  1: 'bg-amber-400 text-white',
  2: 'bg-neutral-300 text-white',
  3: 'bg-orange-400 text-white',
};

// Teaser du vrai classement CHAIR (même score "engagement" que /app/classements,
// pas un simple tri par note) — remplace l'ancien TopRatedGeoSection qui
// utilisait sort=rating, un critère différent du classement réel, ce qui
// aurait pu montrer un ordre incohérent entre la home et la page classement.
export default function HomeRankingSection({ fallback }: { fallback: RankedEntry[] }) {
  const [entries, setEntries] = useState<RankedEntry[]>(fallback);
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    const loc = getStoredLocation();
    if (!loc?.city) return;
    setCity(loc.city);
    const params = new URLSearchParams({ type: 'engagement', city: loc.city, limit: '5' });
    fetch(`${API}/leaderboard?${params}`)
      .then((r) => r.json())
      .then((d: { results: RankedEntry[] }) => { if (d.results?.length) setEntries(d.results); })
      .catch(() => {});
  }, []);

  if (!entries.length) return null;

  return (
    <section className="pt-10">
      <SectionHeader
        tag="Classement"
        tagIcon={<Trophy size={11} className="text-amber-500" />}
        title={city ? `Le top de ${city}` : 'Les meilleurs coiffeurs CHAIR'}
        href="/app/classements"
      />
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto space-y-2">
        {entries.slice(0, 5).map((h) => {
          const avatar = resolveMediaUrl(h.avatar);
          const rankCls = RANK_TONE[h.rank] ?? 'bg-neutral-100 text-neutral-500';
          return (
            <Link
              key={h.id}
              href={`/app/coiffeur/${h.slug}`}
              className="flex items-center gap-3.5 bg-white rounded-2xl border border-neutral-100 px-4 py-3.5 hover:border-neutral-200 hover:shadow-sm active:scale-[0.98] active:bg-neutral-50 transition-all"
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${rankCls}`}>
                {h.rank}
              </span>
              <div className="relative w-11 h-11 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
                {avatar ? (
                  <Image src={avatar} alt={h.name} fill className="object-cover" sizes="44px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                    <span className="font-bold text-neutral-400">{h.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-bold text-neutral-900 truncate">{h.name}</p>
                  {h.is_verified && <BadgeCheck size={13} className="text-neutral-900 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {h.city && (
                    <span className="flex items-center gap-0.5 text-[11px] text-neutral-400">
                      <MapPin size={9} />{h.city}
                    </span>
                  )}
                  {h.specialty && <span className="text-[11px] text-neutral-400 truncate">{h.specialty}</span>}
                </div>
              </div>
              {h.reviews_count > 0 && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-[15px] font-bold text-neutral-900">{h.avg_rating.toFixed(1)}</p>
                  <p className="text-[10px] text-neutral-400">{h.reviews_count} avis</p>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
