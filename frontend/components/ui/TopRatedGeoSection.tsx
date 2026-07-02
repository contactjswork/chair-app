'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ChevronRight, BadgeCheck, MapPin } from 'lucide-react';
import { getStoredLocation } from '@/hooks/useGeolocation';
import { resolveMediaUrl } from '@/lib/types';
import type { ApiHairdresserProfile, PaginatedResponse } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export default function TopRatedGeoSection({ fallback }: { fallback: ApiHairdresserProfile[] }) {
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>(fallback);
  const [isGeo, setIsGeo] = useState(false);

  useEffect(() => {
    const loc = getStoredLocation();
    if (!loc) return;
    setIsGeo(true);
    const params = new URLSearchParams({
      sort:     'rating',
      lat:      String(loc.latitude),
      lng:      String(loc.longitude),
      radius:   '50',
      per_page: '5',
    });
    fetch(`${API}/hairdressers?${params}`)
      .then((r) => r.json())
      .then((d: PaginatedResponse<ApiHairdresserProfile>) => { if (d.data?.length) setHairdressers(d.data); })
      .catch(() => {});
  }, []);

  if (!hairdressers.length) return null;

  return (
    <section className="pt-10">
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-400 mb-1.5">Excellence</p>
          <h2 className="text-[20px] md:text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">
            {isGeo ? 'Les mieux notés près de vous' : 'Les mieux notés'}
          </h2>
          <p className="text-[12px] text-neutral-400 mt-1 leading-relaxed max-w-sm">
            {isGeo ? 'TOP 5 coiffeurs plébiscités dans votre secteur' : 'Les coiffeurs plébiscités par leurs clients'}
          </p>
        </div>
        <Link href="/app/recherche" className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
          <ChevronRight size={16} strokeWidth={2.5} className="text-neutral-900" />
        </Link>
      </div>
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto space-y-2">
        {hairdressers.slice(0, 5).map((h, idx) => {
          const avatar = resolveMediaUrl(h.user.avatar);
          const hasRating = h.reviews_count > 0;
          const rankCls = idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-neutral-400' : idx === 2 ? 'text-orange-400' : 'text-neutral-300';
          return (
            <Link
              key={h.id}
              href={`/app/coiffeur/${h.slug}`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-100 px-4 py-3.5 hover:border-neutral-200 hover:shadow-sm transition-all group"
            >
              <span className={`w-5 text-center text-[13px] font-bold flex-shrink-0 ${rankCls}`}>{idx + 1}</span>
              <div className="relative w-11 h-11 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
                {avatar ? (
                  <Image src={avatar} alt={h.user.name} fill className="object-cover" sizes="44px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                    <span className="font-bold text-neutral-400">{h.user.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-bold text-neutral-900 truncate">{h.user.name}</p>
                  {h.is_verified && <BadgeCheck size={13} className="text-neutral-900 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {h.city && (
                    <span className="flex items-center gap-0.5 text-[11px] text-neutral-400">
                      <MapPin size={9} />{h.city}
                    </span>
                  )}
                  {h.specialties[0] && <span className="text-[11px] text-neutral-400 truncate">{h.specialties[0].name}</span>}
                </div>
              </div>
              {hasRating && (
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-0.5 justify-end">
                    <Star size={12} className="fill-amber-400 stroke-none" />
                    <span className="text-[15px] font-bold text-neutral-900">{parseFloat(h.avg_rating).toFixed(1)}</span>
                  </div>
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
