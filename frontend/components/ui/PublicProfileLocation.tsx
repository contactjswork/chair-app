'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { MapAdapter } from '@/components/search/mapProvider';
import type { ApiHairdresserProfile } from '@/lib/types';

/**
 * Où travaille ce coiffeur — carte + itinéraire.
 *
 * La fiche indiquait le salon et la ville en texte, sans jamais montrer
 * l'endroit : impossible de juger si c'est sur le trajet, ni d'y aller. Cette
 * section répond aux deux questions, avec la même carte que la recherche
 * (Apple Plans, repli OpenStreetMap) plutôt qu'une image statique.
 *
 * L'itinéraire part vers l'application de cartes du téléphone, jamais dans
 * l'app : `target="_blank"` fait passer la demande au système, qui ouvre Plans
 * ou Google Maps. Sans ça, l'utilisateur se retrouverait avec une carte
 * embarquée dans CHAIR, sans navigation vocale et sans moyen de revenir.
 *
 * Ne s'affiche pas du tout si le profil n'a pas de coordonnées exploitables —
 * une carte centrée sur un point faux est pire que pas de carte.
 */

interface Props {
  hairdresser: ApiHairdresserProfile;
}

/**
 * Conversion défensive : `latitude`/`longitude` remontent parfois en chaînes
 * (colonnes DECIMAL non castées côté serveur). Une chaîne passée à MapKit fait
 * lever « `latitude` is not a number » et emporte toute la page.
 */
function toCoord(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function PublicProfileLocation({ hairdresser }: Props) {
  const lat = toCoord(hairdresser.latitude);
  const lng = toCoord(hairdresser.longitude);

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
          // Carte de consultation : aucun marqueur à sélectionner, aucune
          // recherche à relancer au déplacement. Les rappels existent parce
          // que l'interface les exige, ils n'ont rien à faire ici.
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
          {
            key: `hairdresser-${hairdresser.id}`,
            lat,
            lng,
            type: 'hairdresser',
            rating: null,
            initials: (hairdresser.user?.name ?? '?').charAt(0).toUpperCase(),
          },
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
  }, [lat, lng, hairdresser.id, hairdresser.user?.name]);

  if (lat === null || lng === null) return null;

  const salonName = hairdresser.salon?.name ?? null;
  const street = hairdresser.work_address ?? null;
  const city = hairdresser.salon?.city ?? hairdresser.city ?? null;

  // Une seule ligne d'adresse, sans répétition ni virgule orpheline.
  const addressLine = [street, city].filter(Boolean).join(' · ') || 'Localisation approximative';

  const destination = `${lat},${lng}`;
  const label = encodeURIComponent(salonName ?? hairdresser.user?.name ?? 'CHAIR');
  const appleMapsUrl = `https://maps.apple.com/?daddr=${destination}&q=${label}&dirflg=d`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  return (
    <section className="px-4 pt-2 pb-6">
      <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-3">
        Où le trouver
      </p>

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
              {salonName && (
                <p className="text-[13.5px] font-semibold text-neutral-900 leading-snug truncate">
                  {salonName}
                </p>
              )}
              <p className="text-[12.5px] text-neutral-500 leading-relaxed break-words">
                {addressLine}
              </p>
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
