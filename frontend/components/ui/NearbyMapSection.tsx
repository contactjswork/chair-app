'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGeo, getUserSpecialtySlugs } from '@/lib/homeFilters';
import { fetchHairdressersProgressive } from '@/lib/homeFetch';
import { SectionHeader } from './HomeGeoStrips';
import type { ApiHairdresserProfile } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';
import type { MapAdapter, MapMarkerData } from '@/components/search/mapProvider';

/**
 * Remplace l'ancienne section "Tendance" — un aperçu carte (rectangle),
 * jamais interactif dans le fil (pointer-events désactivé sur la carte
 * elle-même pour ne jamais entrer en conflit avec le scroll de la page),
 * qui renvoie vers la vraie carte de recherche au tap.
 */
export default function NearbyMapSection() {
  const { user, isLoading } = useAuth();
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>([]);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MapAdapter | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Mémoïsé : getUserGeo(user) renvoie un nouvel objet à chaque appel — sans
  // ça, l'effet de montage carte ci-dessous (déps [geo, hairdressers]) le
  // voyait changer à CHAQUE rendu et détruisait/recréait la carte en boucle.
  const geo = useMemo(() => getUserGeo(user), [user]);

  useEffect(() => {
    if (isLoading || !geo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
      return;
    }
    fetchHairdressersProgressive(getUserSpecialtySlugs(), geo, 20)
      .then(({ results }) => setHairdressers(results))
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  useEffect(() => {
    if (!containerRef.current || !geo || hairdressers.length === 0) return;
    let cancelled = false;

    (async () => {
      const { LeafletAdapter } = await import('@/components/search/leafletAdapter');
      if (cancelled || !containerRef.current) return;
      const adapter = new LeafletAdapter();
      await adapter.init(containerRef.current, {
        center: { lat: geo.lat, lng: geo.lng },
        zoom: 12,
        onSelect: () => {},
        onBackgroundTap: () => {},
        onUserMoveEnd: () => {},
      });
      if (cancelled) { adapter.destroy(); return; }
      adapterRef.current = adapter;

      const markers: MapMarkerData[] = hairdressers
        .filter((h) => h.latitude != null && h.longitude != null)
        .map((h) => ({
          key: `hairdresser-${h.id}`,
          lat: Number(h.latitude),
          lng: Number(h.longitude),
          type: 'hairdresser',
          rating: h.reviews_count > 0 ? parseFloat(h.avg_rating) : null,
          avatarUrl: resolveMediaUrl(h.user.avatar),
          initials: h.user.name.charAt(0),
        }));
      adapter.setMarkers(markers);

      // Sans ça, Leaflet fige la taille mesurée à l'init — si le layout de la
      // carte (image de fond, transition d'entrée du fil) bouge après coup,
      // les tuiles restent cadrées sur l'ancienne taille, plus petite : un
      // rectangle de carte flottant avec une marge grise visible autour.
      adapter.invalidateSize();
      if (containerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => adapterRef.current?.invalidateSize());
        resizeObserverRef.current.observe(containerRef.current);
      }
    })();

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
  }, [geo, hairdressers]);

  if (!ready || !geo || hairdressers.length === 0) return null;

  return (
    <section className="pt-10">
      <SectionHeader tag="Autour de vous" title="Sur la carte" href="/app/recherche" />
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto">
        <Link
          href="/app/recherche"
          className="relative block h-[190px] md:h-[240px] rounded-3xl overflow-hidden bg-neutral-100 active:scale-[0.98] transition-transform duration-150"
        >
          <div ref={containerRef} className="absolute inset-0 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur px-3.5 py-2 rounded-full shadow">
              <MapPin size={13} className="text-neutral-900" />
              <span className="text-[12px] font-bold text-neutral-900">
                {hairdressers.length}+ coiffeurs {geo.city ? `près de ${geo.city}` : 'près de vous'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow flex-shrink-0">
              <ChevronRight size={16} strokeWidth={2.5} className="text-neutral-900" />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
