'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { MapAdapter, MapBounds, MapLatLng, MapViewport } from '@/components/search/mapProvider';

export interface ChairMapItem {
  id: number;
  lat: number;
  lng: number;
  pricePerDay?: number | null;
}

export interface ChairSearchMapHandle {
  fitToResults: () => void;
  invalidateSize: () => void;
}

interface Props {
  items: ChairMapItem[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  initialCenter: MapLatLng;
  initialZoom: number;
  className?: string;
}

/**
 * Carte dédiée à la recherche de fauteuils par les coiffeurs indépendants —
 * composant entièrement séparé de SearchMap (carte client). Mêmes mécaniques
 * bas niveau (LeafletAdapter, tuiles CARTO) mais ses propres marqueurs
 * (pastille prix, jamais avatar/note), sa propre instance de carte, jamais
 * montée en même temps que la carte de recherche client ou salon.
 */
const ChairSearchMap = forwardRef<ChairSearchMapHandle, Props>(function ChairSearchMap(
  { items, selectedId, onSelect, initialCenter, initialZoom, className },
  ref
) {
  const containerRef      = useRef<HTMLDivElement>(null);
  const adapterRef        = useRef<MapAdapter | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const readyRef          = useRef(false);
  const pendingRef        = useRef<(() => void)[]>([]);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const runWhenReady = (fn: () => void) => {
    if (readyRef.current) fn();
    else pendingRef.current.push(fn);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const { createAndInitMapAdapter } = await import('@/components/search/createMapAdapter');
      if (cancelled || !containerRef.current) return;

      const adapter = await createAndInitMapAdapter(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        onSelect: (key) => onSelectRef.current(parseInt(key.replace('chair-', ''), 10)),
        onBackgroundTap: () => onSelectRef.current(null),
        onUserMoveEnd: () => {},
      });

      if (cancelled) { adapter.destroy(); return; }

      adapterRef.current = adapter;
      readyRef.current = true;
      pendingRef.current.forEach((fn) => fn());
      pendingRef.current = [];

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

  useEffect(() => {
    runWhenReady(() => {
      adapterRef.current?.setMarkers(
        items.map((it) => ({
          key: `chair-${it.id}`,
          lat: it.lat,
          lng: it.lng,
          type: 'chair' as const,
          rating: null,
          priceLabel: it.pricePerDay ? `${it.pricePerDay}€/j` : '',
        }))
      );
    });

  }, [items]);

  useEffect(() => {
    runWhenReady(() => adapterRef.current?.setSelected(selectedId != null ? `chair-${selectedId}` : null));

  }, [selectedId]);

  useImperativeHandle(ref, () => ({
    fitToResults: () => {
      runWhenReady(() => {
        if (items.length === 0) return;
        const lats = items.map((it) => it.lat);
        const lngs = items.map((it) => it.lng);
        const bounds: MapBounds = {
          sw_lat: Math.min(...lats), sw_lng: Math.min(...lngs),
          ne_lat: Math.max(...lats), ne_lng: Math.max(...lngs),
        };
        adapterRef.current?.fitBounds(bounds);
      });
    },
    invalidateSize: () => runWhenReady(() => adapterRef.current?.invalidateSize()),
  }));

  return <div ref={containerRef} className={className ?? 'w-full h-full'} />;
});

export default ChairSearchMap;

// Type ré-exporté pour les consommateurs qui n'ont besoin que du viewport.
export type { MapViewport };
