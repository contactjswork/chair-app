'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { ExploreResult } from '@/lib/explore';
import { resultKey } from '@/lib/explore';
import { resolveMediaUrl } from '@/lib/types';
import type { MapAdapter, MapBounds, MapLatLng, MapViewport } from './mapProvider';

export interface SearchMapHandle {
  setCenter: (loc: MapLatLng, zoom?: number) => void;
  fitToResults: () => void;
  invalidateSize: () => void;
  getViewport: () => MapViewport | null;
}

interface Props {
  results: ExploreResult[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  onUserMoved: (viewport: MapViewport) => void;
  userLocation: MapLatLng | null;
  initialCenter: MapLatLng;
  initialZoom: number;
  className?: string;
}

/**
 * Wrapper React du fournisseur de carte. L'adaptateur (Leaflet) est chargé
 * dynamiquement côté client uniquement — jamais au SSR.
 */
const SearchMap = forwardRef<SearchMapHandle, Props>(function SearchMap(
  { results, selectedKey, onSelect, onUserMoved, userLocation, initialCenter, initialZoom, className },
  ref
) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const adapterRef         = useRef<MapAdapter | null>(null);
  const resizeObserverRef  = useRef<ResizeObserver | null>(null);
  const readyRef           = useRef(false);
  // Files d'attente tant que l'adaptateur charge — la dernière valeur gagne
  const pendingRef   = useRef<(() => void)[]>([]);

  const onSelectRef    = useRef(onSelect);
  const onUserMovedRef = useRef(onUserMoved);
  onSelectRef.current    = onSelect;
  onUserMovedRef.current = onUserMoved;

  const runWhenReady = (fn: () => void) => {
    if (readyRef.current) fn();
    else pendingRef.current.push(fn);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const { createAndInitMapAdapter } = await import('./createMapAdapter');
      if (cancelled || !containerRef.current) return;

      const adapter = await createAndInitMapAdapter(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        onSelect: (key) => onSelectRef.current(key),
        onBackgroundTap: () => onSelectRef.current(null),
        onUserMoveEnd: (vp) => onUserMovedRef.current(vp),
      });

      if (cancelled) {
        adapter.destroy();
        return;
      }

      adapterRef.current = adapter;
      readyRef.current = true;
      pendingRef.current.forEach((fn) => fn());
      pendingRef.current = [];

      // Le conteneur peut encore bouger juste après le mount (bascule de
      // layout mobile/desktop) — recale Leaflet sur sa taille réelle.
      adapter.invalidateSize();
      if (containerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => adapterRef.current?.invalidateSize());
        resizeObserverRef.current.observe(containerRef.current);
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      pendingRef.current = [];
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
    // La carte s'initialise une seule fois — le centre initial ne doit pas la recréer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marqueurs — uniquement les fiches avec de vraies coordonnées
  useEffect(() => {
    runWhenReady(() => {
      adapterRef.current?.setMarkers(
        results
          .filter((r) => r.has_coords && r.latitude != null && r.longitude != null)
          .map((r) => ({
            key: resultKey(r),
            lat: r.latitude!,
            lng: r.longitude!,
            type: r.type,
            rating: r.reviews_count > 0 ? r.avg_rating : null,
            avatarUrl: r.type === 'hairdresser' ? resolveMediaUrl(r.avatar) : null,
            initials: r.name,
            levelColor: r.type === 'hairdresser' ? (r.chair_level?.color ?? null) : null,
          }))
      );
    });
     
  }, [results]);

  useEffect(() => {
    runWhenReady(() => adapterRef.current?.setSelected(selectedKey));
     
  }, [selectedKey]);

  useEffect(() => {
    runWhenReady(() => adapterRef.current?.setUserLocation(userLocation));
     
  }, [userLocation]);

  useImperativeHandle(ref, () => ({
    setCenter: (loc, zoom) => runWhenReady(() => adapterRef.current?.setCenter(loc, zoom)),
    fitToResults: () => {
      runWhenReady(() => {
        const located = results.filter((r) => r.has_coords && r.latitude != null && r.longitude != null);
        if (located.length === 0) return;
        const lats = located.map((r) => r.latitude!);
        const lngs = located.map((r) => r.longitude!);
        const bounds: MapBounds = {
          sw_lat: Math.min(...lats), sw_lng: Math.min(...lngs),
          ne_lat: Math.max(...lats), ne_lng: Math.max(...lngs),
        };
        adapterRef.current?.fitBounds(bounds);
      });
    },
    invalidateSize: () => runWhenReady(() => adapterRef.current?.invalidateSize()),
    getViewport: () => adapterRef.current?.getViewport() ?? null,
  }));

  return <div ref={containerRef} className={className ?? 'w-full h-full'} />;
});

export default SearchMap;
