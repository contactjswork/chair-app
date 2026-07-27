'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Building2, Heart, MapPin, Star, Users } from 'lucide-react';
import type { ExploreResult } from '@/lib/explore';
import { resultHref } from '@/lib/explore';
import { resolveMediaUrl } from '@/lib/types';
import { formatDistance } from '@/hooks/useGeolocation';
import { LEVEL_RING, ringGradientClass } from '@/lib/chairLevel';
import { PremiumBadge } from '@/components/ui/PremiumLock';

interface Props {
  result: ExploreResult;
  selected?: boolean;
  /** null = favoris indisponibles (non connecté) — le cœur n'apparaît pas */
  isFavorite?: boolean | null;
  onToggleFavorite?: (r: ExploreResult) => void;
  onClick?: (r: ExploreResult) => void;
  compact?: boolean;
}

function fmtRating(r: number): string {
  return r.toFixed(1).replace('.', ',');
}

function fmtPrice(p: number): string {
  return Number.isInteger(p) ? String(p) : p.toFixed(2).replace('.', ',');
}

/**
 * Carte résultat unique pour salons et coiffeurs — même format, même poids
 * visuel. Un coiffeur salarié n'est jamais étiqueté "indépendant"/"salon" en
 * gros label : sa fiche montre sa photo et, s'il est en salon, une simple
 * ligne de contexte "Chez [Salon]", exactement au même niveau qu'un indépendant.
 */
export default function SearchResultCard({ result: r, selected = false, isFavorite = null, onToggleFavorite, onClick, compact = false }: Props) {
  const isSalon = r.type === 'salon';
  // Coiffeur : photo de profil (même logique que le marqueur avatar sur la
  // carte) — la bannière est un visuel de portfolio, pas une photo de la personne.
  const image = resolveMediaUrl(isSalon ? r.image : (r.avatar ?? r.image));
  const hasRating = r.reviews_count > 0;
  const matched   = r.matched_pros[0];
  const size      = compact ? 72 : 92;

  const levelColor = r.chair_level?.color ?? 'neutral';
  const ring = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;

  return (
    <div className="relative">
      <Link
        href={resultHref(r)}
        onClick={() => onClick?.(r)}
        className={`flex gap-3.5 p-3 rounded-2xl border transition-all active:bg-neutral-50 ${
          selected ? 'border-neutral-900 shadow-sm' : 'border-neutral-100 hover:border-neutral-300'
        }`}
      >
        {/* Visuel — cercle pour un coiffeur (sa photo, sa marque), coin arrondi
            pour un salon (photo d'un lieu). Anneau CHAIR autour de la photo si
            le coiffeur a un niveau de progression. */}
        <div
          className="relative flex-shrink-0"
          style={{ width: size, height: size }}
        >
          {!isSalon && ring.show && (
            <div className={`absolute inset-0 rounded-full ${ringGradientClass(levelColor)}`} />
          )}
          <div
            className={`relative overflow-hidden bg-neutral-100 ${isSalon ? 'rounded-xl' : 'rounded-full'} ${
              !isSalon && ring.show ? 'w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px]' : 'w-full h-full'
            }`}
          >
            {image ? (
              <Image src={image} alt={r.name} fill className="object-cover" sizes={`${size}px`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                <span className="text-xl font-bold text-neutral-400">{r.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-center gap-1.5 pr-8">
            <h3 className="text-[14px] font-bold text-neutral-900 truncate leading-tight">{r.name}</h3>
            {r.is_verified && <BadgeCheck size={14} className="text-neutral-900 flex-shrink-0" />}
            {r.is_chair_plus && <PremiumBadge />}
            {r.is_chair_pick && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                <Heart size={9} fill="currentColor" />Coup de cœur
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 mt-1">
            {(r.distance_km != null || r.city) && (
              <span className="flex items-center gap-0.5 text-[12px] text-neutral-400 truncate">
                <MapPin size={10} className="flex-shrink-0" />
                {r.distance_km != null ? formatDistance(r.distance_km) : r.city}
                {r.distance_km != null && r.city ? <span className="truncate"> · {r.city}</span> : null}
              </span>
            )}
            {hasRating && (
              <span className="flex items-center gap-0.5 text-[12px] font-semibold text-neutral-900 flex-shrink-0">
                <Star size={10} className="fill-amber-400 stroke-none" />
                {fmtRating(r.avg_rating)}
                <span className="font-normal text-neutral-400 text-[11px]">({r.reviews_count})</span>
              </span>
            )}
          </div>

          {/* Contexte discret — jamais un label de catégorie */}
          {isSalon && r.team_count != null && (
            <p className="flex items-center gap-1 text-[11px] text-neutral-500 mt-1 truncate">
              <Users size={10} className="flex-shrink-0" />
              {r.team_count} professionnel{r.team_count > 1 ? 's' : ''}
            </p>
          )}
          {!isSalon && r.salon && (
            <p className="flex items-center gap-1 text-[11px] text-neutral-500 mt-1 truncate">
              <Building2 size={10} className="flex-shrink-0" />
              Chez {r.salon.name}
            </p>
          )}
          {matched && (
            <p className="flex items-center gap-1 text-[11px] text-neutral-500 mt-1 truncate">
              <Users size={10} className="flex-shrink-0" />
              Avec {matched.name}
            </p>
          )}

          {!compact && r.specialties.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {r.specialties.slice(0, 3).map((s) => (
                <span key={s.slug} className="text-[9px] font-semibold uppercase tracking-wide bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
                  {s.name}
                </span>
              ))}
            </div>
          )}

          {r.price_from != null && (
            <p className="text-[11px] text-neutral-500 mt-1">
              À partir de <span className="font-semibold text-neutral-900">{fmtPrice(r.price_from)} €</span>
            </p>
          )}
        </div>
      </Link>

      {/* Favori — coiffeurs uniquement (les salons n'ont pas de favoris) */}
      {!isSalon && isFavorite !== null && onToggleFavorite && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(r); }}
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 hover:bg-neutral-50 transition-colors"
        >
          <Heart
            size={16}
            className={isFavorite ? 'fill-neutral-900 stroke-neutral-900' : 'stroke-neutral-400'}
            strokeWidth={1.8}
          />
        </button>
      )}
    </div>
  );
}
