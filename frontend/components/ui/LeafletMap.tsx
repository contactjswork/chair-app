'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { ApiHairdresserProfile } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';
import { formatDistance } from '@/hooks/useGeolocation';

interface Props {
  hairdressers: ApiHairdresserProfile[];
  userLat?: number;
  userLng?: number;
  onSelect?: (hairdresser: ApiHairdresserProfile) => void;
}

export default function LeafletMap({ hairdressers, userLat, userLng, onSelect }: Props) {
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import('leaflet').Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapRef.current) return;

      // Éviter double initialisation
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      // Centrer sur utilisateur ou premier coiffeur avec coords
      const firstWithCoords = hairdressers.find((h) => h.latitude && h.longitude);
      const centerLat = userLat ?? (firstWithCoords ? Number(firstWithCoords.latitude) : 48.8566);
      const centerLng = userLng ?? (firstWithCoords ? Number(firstWithCoords.longitude) : 2.3522);
      const zoom = userLat ? 12 : 6;

      const map = L.map(mapRef.current, { zoomControl: true }).setView([centerLat, centerLng], zoom);
      mapInstance.current = map;

      // Tuiles OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Marqueur position utilisateur
      if (userLat && userLng) {
        const userIcon = L.divIcon({
          html: `<div style="width:14px;height:14px;background:#0a0a0a;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([userLat, userLng], { icon: userIcon })
          .addTo(map)
          .bindPopup('<b>Vous êtes ici</b>');
      }

      // Icône coiffeur
      const hairIcon = L.divIcon({
        html: `<div style="width:32px;height:32px;background:#0a0a0a;border:2.5px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.3);cursor:pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3a3 3 0 0 1 3 3"/><path d="M6 21a3 3 0 0 0 3-3"/><path d="M20 3c0 9.6-8 16-14 16"/><path d="M20 21c0-3.68-2.6-9.5-6-13"/>
          </svg>
        </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36],
      });

      // Marqueurs coiffeurs
      hairdressers.forEach((h) => {
        if (!h.latitude || !h.longitude) return;

        const rating = h.reviews_count > 0 ? parseFloat(h.avg_rating).toFixed(1) : null;
        const distText = (h as ApiHairdresserProfile & { distance_km?: number }).distance_km != null
          ? ` · ${formatDistance((h as ApiHairdresserProfile & { distance_km?: number }).distance_km!)}`
          : '';

        const popupHtml = `
          <div style="font-family:system-ui,sans-serif;min-width:160px;padding:4px 0">
            <div style="font-weight:700;font-size:13px;color:#0a0a0a;margin-bottom:3px">${h.user.name}</div>
            <div style="font-size:11px;color:#737373;margin-bottom:5px">${h.city ?? ''}${distText}</div>
            ${rating ? `<div style="font-size:12px;font-weight:600;color:#0a0a0a;margin-bottom:6px">★ ${rating} <span style="font-weight:400;color:#a3a3a3">(${h.reviews_count} avis)</span></div>` : ''}
            <a href="/coiffeur/${h.slug}" style="display:block;background:#0a0a0a;color:white;text-align:center;padding:7px 12px;border-radius:10px;font-size:12px;font-weight:600;text-decoration:none">
              Voir le profil
            </a>
          </div>`;

        L.marker([Number(h.latitude), Number(h.longitude)], { icon: hairIcon })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 200 })
          .on('click', () => onSelect?.(h));
      });
    });

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hairdressers.length, userLat, userLng]);

  return <div ref={mapRef} className="w-full h-full" />;
}
