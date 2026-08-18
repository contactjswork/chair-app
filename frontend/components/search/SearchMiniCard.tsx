'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Building2, ChevronRight, MapPin, Star, X } from 'lucide-react';
import type { ExploreResult } from '@/lib/explore';
import { resultHref } from '@/lib/explore';
import { resolveMediaUrl } from '@/lib/types';
import { formatDistance } from '@/hooks/useGeolocation';
import { LEVEL_RING, ringGradientClass } from '@/lib/chairLevel';
import { PremiumBadge } from '@/components/ui/PremiumLock';

interface Props {
  result: ExploreResult;
  onClose: () => void;
}

/** Mini fiche flottante affichée au tap sur un marqueur — le tap sur la fiche
 *  ouvre le profil, la croix la referme sans naviguer. */
export default function SearchMiniCard({ result: r, onClose }: Props) {
  const isSalon = r.type === 'salon';
  const image = resolveMediaUrl(isSalon ? r.image : (r.avatar ?? r.image));
  const hasRating = r.reviews_count > 0;

  const levelColor = r.chair_level?.color ?? 'neutral';
  const ring = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;

  return (
    <div
      className="relative bg-white rounded-2xl border border-neutral-100 overflow-hidden"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}
    >
      <Link href={resultHref(r)} className="flex items-center gap-3 p-3 pr-10 active:bg-neutral-50">
        <div className="relative flex-shrink-0 w-[52px] h-[52px]">
          {!isSalon && ring.show && (
            <div className={`absolute inset-0 rounded-full ${ringGradientClass(levelColor)}`} />
          )}
          <div
            className={`relative overflow-hidden bg-neutral-100 ${isSalon ? 'rounded-xl' : 'rounded-full'} ${
              !isSalon && ring.show ? 'w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px]' : 'w-full h-full'
            }`}
          >
            {image ? (
              <Image src={image} alt={r.name} fill className="object-cover" sizes="52px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                <span className="text-lg font-bold text-neutral-400">{r.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="text-[13px] font-bold text-neutral-900 truncate leading-tight">{r.name}</h3>
            {r.is_verified && <BadgeCheck size={12} className="text-neutral-900 flex-shrink-0" />}
            {r.is_chair_plus && <PremiumBadge />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {(r.distance_km != null || r.city) && (
              <span className="flex items-center gap-0.5 text-[11px] text-neutral-400 truncate">
                <MapPin size={9} className="flex-shrink-0" />
                {r.distance_km != null ? formatDistance(r.distance_km) : r.city}
              </span>
            )}
            {hasRating && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-neutral-900 flex-shrink-0">
                <Star size={9} className="fill-neutral-900 stroke-none" />
                {r.avg_rating.toFixed(1).replace('.', ',')}
                <span className="font-normal text-neutral-400">({r.reviews_count})</span>
              </span>
            )}
          </div>
          {/* Spécialité dominante + prix — une seule ligne, tronquée */}
          {(r.specialties.length > 0 || r.price_from != null) && (
            <p className="flex items-baseline gap-1.5 mt-0.5 text-[10.5px]">
              {r.specialties.length > 0 && (
                <span className="text-neutral-500 truncate">{r.specialties[0].name}</span>
              )}
              {r.price_from != null && (
                <span className="flex-shrink-0 font-semibold text-neutral-900 tabular-nums">
                  dès {Number.isInteger(r.price_from) ? r.price_from : r.price_from.toFixed(2).replace('.', ',')} €
                </span>
              )}
            </p>
          )}
          {!isSalon && r.salon && (
            <p className="flex items-center gap-1 text-[10px] text-neutral-400 mt-0.5 truncate">
              <Building2 size={9} className="flex-shrink-0" />
              Chez {r.salon.name}
            </p>
          )}
        </div>

        <ChevronRight size={15} className="text-neutral-300 flex-shrink-0" />
      </Link>

      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center transition-transform active:scale-90"
      >
        <X size={12} className="text-neutral-600" />
      </button>
    </div>
  );
}
