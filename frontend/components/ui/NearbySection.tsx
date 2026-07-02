'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Navigation } from 'lucide-react';
import { getStoredLocation, hasGeoBeenAsked, formatDistance } from '@/hooks/useGeolocation';
import HairdresserCard from './HairdresserCard';
import type { ApiHairdresserProfile, PaginatedResponse } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

const RADIUS_OPTIONS = [
  { label: '5 km',  value: 5 },
  { label: '10 km', value: 10 },
  { label: '20 km', value: 20 },
  { label: '50 km', value: 50 },
];

export default function NearbySection() {
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [radius, setRadius]             = useState(20);
  const [hasLocation, setHasLocation]   = useState(false);
  const [asked, setAsked]               = useState(false);

  useEffect(() => {
    setAsked(hasGeoBeenAsked());
    const loc = getStoredLocation();
    if (loc) {
      setHasLocation(true);
      fetchNearby(loc.latitude, loc.longitude, radius);
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchNearby(lat: number, lng: number, r: number) {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(r),
        per_page: '8',
      });
      const res = await fetch(`${API}/hairdressers?${params}`);
      if (!res.ok) throw new Error();
      const data: PaginatedResponse<ApiHairdresserProfile & { distance_km?: number }> = await res.json();
      setHairdressers(data.data);
    } catch {
      setHairdressers([]);
    }
    setIsLoading(false);
  }

  function handleRadius(r: number) {
    setRadius(r);
    const loc = getStoredLocation();
    if (loc) fetchNearby(loc.latitude, loc.longitude, r);
  }

  // Pas de position et jamais demandé → ne pas afficher (la modal s'en chargera)
  if (!hasLocation && !asked) return null;

  // Géo refusée et pas de résultats → ne pas afficher
  if (!hasLocation) return null;

  // Chargement
  if (isLoading) {
    return (
      <section className="py-8 md:py-10">
        <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-4">
          <div className="h-5 w-40 bg-neutral-100 rounded animate-pulse mb-2" />
          <div className="h-3 w-60 bg-neutral-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 md:px-8 no-scrollbar pb-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-40 aspect-[3/4] rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (hairdressers.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      {/* Header */}
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Navigation size={14} className="text-neutral-400" />
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              Près de vous
            </span>
          </div>
          <h2 className="text-[15px] md:text-[17px] font-bold text-neutral-900 tracking-tight">
            Coiffeurs autour de vous
          </h2>
        </div>
        <Link href="/app/recherche" className="text-[12px] font-semibold text-neutral-400 hover:text-neutral-900 transition-colors flex-shrink-0 mt-0.5">
          Voir tout
        </Link>
      </div>

      {/* Filtres distance */}
      <div className="flex gap-2 overflow-x-auto px-4 md:px-8 no-scrollbar mb-4">
        {RADIUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleRadius(opt.value)}
            className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
              radius === opt.value
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grille scroll horizontal */}
      <div className="flex gap-3 overflow-x-auto px-4 md:px-8 no-scrollbar pb-1">
        {hairdressers.map((h) => {
          const hWithDist = h as ApiHairdresserProfile & { distance_km?: number };
          return (
            <div key={h.id} className="flex-shrink-0 w-40 md:w-48">
              <HairdresserCard hairdresser={h} distanceKm={hWithDist.distance_km} />
            </div>
          );
        })}
      </div>

      {hairdressers.length === 0 && (
        <div className="px-4 md:px-8 py-8 text-center">
          <MapPin size={24} className="text-neutral-200 mx-auto mb-3" />
          <p className="text-sm text-neutral-400">
            Aucun coiffeur dans un rayon de {radius} km.
          </p>
          <button
            onClick={() => handleRadius(50)}
            className="mt-3 text-sm font-semibold text-neutral-900 underline underline-offset-2"
          >
            Élargir à 50 km
          </button>
        </div>
      )}
    </section>
  );
}
