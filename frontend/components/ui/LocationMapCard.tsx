'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { MapAdapter } from '@/components/search/mapProvider';

/**
 * Carte de localisation + itinéraire — partagée par la fiche coiffeur et la
 * fiche salon.
 *
 * Une adresse en texte ne répond à aucune des deux questions qu'on se pose
 * vraiment : est-ce sur mon trajet, et comment j'y vais ? La carte répond à la
 * première, les deux boutons à la seconde.
 *
 * L'itinéraire part vers l'application de cartes du téléphone, jamais dans
 * l'app : `target="_blank"` confie la demande au système, qui ouvre Plans ou
 * Google Maps. Une carte embarquée dans CHAIR n'aurait ni navigation vocale ni
 * moyen de revenir.
 *
 * Ne rend rien sans coordonnées exploitables — une carte centrée sur un point
 * faux est pire qu'une absence de carte.
 */

interface Props {
  /** Peuvent arriver en chaîne : colonnes DECIMAL non castées côté serveur. */
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
  /** Titre de l'encart (« Où le trouver », « Adresse »…). */
  sectionTitle?: string;
  /** Nom mis en avant sous la carte (salon, enseigne) — facultatif. */
  placeName?: string | null;
  /** Rue, ville… déjà assemblées par l'appelant. */
  addressLine?: string | null;
  /** Initiale affichée dans le marqueur. */
  markerInitial?: string;
  markerKey: string;
  className?: string;
}

/**
 * Conversion défensive : une chaîne passée à MapKit fait lever
 * « `latitude` is not a number » et emporte toute la page.
 */
function toCoord(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function LocationMapCard({
  latitude,
  longitude,
  sectionTitle = 'Où le trouver',
  placeName = null,
  addressLine = null,
  markerInitial = '?',
  markerKey,
  className = '',
}: Props) {
  const lat = toCoord(latitude);
  const lng = toCoord(longitude);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const adapterRef = useRef<MapAdapter | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (lat === null || lng === null) return;
    let cancelled = false;

    (async () => {
      try {
        const { createAndInitMapAdapter } = await import('@/components/search/createMapAdapter');
        if (cancelled || !containerRef.current) return;

        const adapter = await createAndInitMapAdapter(containerRef.current, {
          center: { lat, lng },
          zoom: 14,
          // Carte de consultation : rien à sélectionner, aucune recherche à
          // relancer au déplacement. Ces rappels n'existent que parce que
          // l'interface les exige.
          onSelect: () => {},
          onBackgroundTap: () => {},
          onUserMoveEnd: () => {},
        });

        if (cancelled) {
          adapter.destroy();
          return;
        }

        adapterRef.current = adapter;
        adapter.setMarkers([
          { key: markerKey, lat, lng, type: 'hairdresser', rating: null, initials: markerInitial },
        ]);
      } catch {
        if (!cancelled) setMapFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
  }, [lat, lng, markerKey, markerInitial]);

  if (lat === null || lng === null) return null;

  const destination = `${lat},${lng}`;
  const label = encodeURIComponent(placeName ?? 'CHAIR');
  const appleMapsUrl = `https://maps.apple.com/?daddr=${destination}&q=${label}&dirflg=d`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  return (
    <section className={className}>
      {sectionTitle && (
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-3">
          {sectionTitle}
        </p>
      )}

      <div className="rounded-3xl overflow-hidden border border-neutral-100 bg-white">
        {mapFailed ? (
          <div className="h-[168px] flex items-center justify-center bg-neutral-50">
            <p className="text-[12px] text-neutral-400">Carte indisponible</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-[168px] w-full bg-neutral-100" />
        )}

        <div className="px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <MapPin size={15} className="mt-0.5 shrink-0 text-neutral-400" />
            <div className="min-w-0">
              {placeName && (
                <p className="text-[13.5px] font-semibold text-neutral-900 leading-snug break-words">
                  {placeName}
                </p>
              )}
              {addressLine && (
                <p className="text-[12.5px] text-neutral-500 leading-relaxed break-words">
                  {addressLine}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-3.5">
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-neutral-900 text-white text-[12.5px] font-semibold px-4 py-2.5 rounded-full active:scale-[0.97] transition-transform"
            >
              <Navigation size={13} />
              Plans
            </a>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 border border-neutral-200 text-neutral-700 text-[12.5px] font-semibold px-4 py-2.5 rounded-full active:scale-[0.97] transition-transform"
            >
              Google Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
