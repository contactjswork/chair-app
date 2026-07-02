'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { availableHairdressers } from '@/lib/api';
import { resolveMediaUrl, type ApiAvailableHairdresser } from '@/lib/types';
import { getStoredLocation } from '@/hooks/useGeolocation';

export default function AvailableTodaySection() {
  const [hairdressers, setHairdressers] = useState<ApiAvailableHairdresser[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState('');

  useEffect(() => {
    const now = new Date();
    setToday(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

    const loc = getStoredLocation();

    availableHairdressers.list({
      when: 'today',
      lat:     loc?.latitude,
      lng:     loc?.longitude,
      radius:  loc ? 50 : undefined,
      per_page: 8,
    })
      .then((res) => setHairdressers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && hairdressers.length === 0) return null;

  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                Disponible aujourd'hui
              </span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900">Créneaux libres — {today}</h2>
          </div>
          <Link
            href="/app/recherche?when=today"
            className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Voir tout
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[1,2,3,4].map((i) => (
              <div key={i} className="w-52 flex-shrink-0 rounded-2xl bg-neutral-100 animate-pulse h-52" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {hairdressers.map((h) => {
              const avatarUrl = resolveMediaUrl(h.user?.avatar);
              const bannerUrl = resolveMediaUrl(h.banner_image);

              return (
                <Link
                  key={h.id}
                  href={`/coiffeur/${h.slug}/reserver`}
                  className="group flex-shrink-0 w-52 bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:border-neutral-300 hover:shadow-sm transition-all"
                >
                  {/* Image */}
                  <div className="relative h-28 bg-neutral-100 overflow-hidden">
                    {bannerUrl ? (
                      <Image
                        src={bannerUrl}
                        alt={h.user?.name ?? ''}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="208px"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white/20">
                          {h.user?.name?.[0] ?? '?'}
                        </span>
                      </div>
                    )}
                    {/* Avatar */}
                    {avatarUrl && (
                      <div className="absolute bottom-2 left-2 w-7 h-7 rounded-full border-2 border-white overflow-hidden">
                        <Image src={avatarUrl} alt="" fill className="object-cover" sizes="28px" />
                      </div>
                    )}
                    {/* Slots badge */}
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      {h.slots_today} créneau{h.slots_today > 1 ? 'x' : ''}
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{h.user?.name}</p>
                    {h.city && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-neutral-400" />
                        <span className="text-[11px] text-neutral-500 truncate">
                          {h.city}
                          {h.distance_km != null ? ` · ${h.distance_km} km` : ''}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      <Calendar size={11} className="text-green-500" />
                      <span className="text-[10px] font-semibold text-green-600">Réserver</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA mobile */}
        <div className="mt-4 md:hidden">
          <Link
            href="/app/recherche?when=today"
            className="flex items-center justify-center gap-2 w-full py-3 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Voir tous les disponibles
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
