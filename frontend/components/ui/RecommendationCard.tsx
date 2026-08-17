'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, BadgeCheck } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/types';
import { formatDistance } from '@/hooks/useGeolocation';
import { LEVEL_RING, ringGradientClass } from '@/lib/chairLevel';
import type { RecommendationResult } from '@/lib/recommendation';

/**
 * Carte "hero" pour /api/recommendations — même langage visuel que HDCard
 * (components/ui/HomeGeoStrips.tsx) mais adaptée au contrat plat de
 * RecommendationResult (pas de `user` imbriqué, chair_level déjà résolu par
 * le backend, jamais estimé côté client faute de posts_count/followers_count
 * dans ce contrat volontairement allégé).
 */
export default function RecommendationCard({ r, size = 'lg' }: { r: RecommendationResult; size?: 'lg' | 'md' }) {
  const banner = resolveMediaUrl(r.image);
  const avatar = resolveMediaUrl(r.avatar);
  const bg = banner ?? avatar;
  const hasRating = r.reviews_count > 0;
  const spec = r.specialties[0]?.name;
  const levelColor = r.chair_level?.color ?? 'neutral';
  const ring = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;
  const width = size === 'lg' ? 'w-[172px] md:w-[200px]' : 'w-[155px] md:w-[172px]';

  return (
    <Link
      href={`/app/coiffeur/${r.slug}`}
      className={`relative flex-shrink-0 ${width} block group active:scale-[0.98] transition-transform duration-150`}
    >
      <div className="relative rounded-2xl overflow-hidden bg-neutral-900 aspect-[3/4]">
        {bg ? (
          <Image
            src={bg}
            alt={r.name}
            fill
            className="object-cover scale-110 blur-sm brightness-50 group-hover:brightness-60 transition-all duration-500"
            sizes="200px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/15" />

        {r.is_chair_pick && (
          <span className="absolute top-2.5 left-2.5 z-10 text-[8px] font-bold tracking-[0.12em] uppercase text-white px-2 py-1 rounded-full bg-neutral-900/80 backdrop-blur-sm border border-white/10">
            Coup de cœur
          </span>
        )}
        {r.is_verified && (
          <div className="absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-full bg-white/95 flex items-center justify-center shadow">
            <BadgeCheck size={11} className="text-neutral-900" />
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center pb-12">
          <div
            className="relative w-[64px] h-[64px] rounded-full p-[2px] shadow-xl group-hover:scale-105 transition-transform duration-300"
            style={ring.show && ring.glow ? { boxShadow: ring.glow } : undefined}
          >
            {ring.show && <div className={`absolute inset-0 rounded-full ${ringGradientClass(levelColor)}`} />}
            <div className={`relative rounded-full overflow-hidden ${ring.show ? 'w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px]' : 'w-full h-full ring-2 ring-white/25'}`}>
              {avatar ? (
                <Image src={avatar} alt={r.name} fill className="object-cover" sizes="64px" />
              ) : (
                <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white/40">{r.name.charAt(0)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          {spec && <p className="text-[8px] font-bold text-white/55 tracking-[0.14em] uppercase mb-1 truncate">{spec}</p>}
          <h3 className="text-white font-bold text-[13px] leading-tight truncate">{r.name}</h3>
          <div className="flex items-center justify-between mt-1 gap-2">
            <p className="text-white/45 text-[10px] truncate">
              {r.distance_km != null ? `à ${formatDistance(r.distance_km)}` : (r.city ?? '')}
            </p>
            {hasRating && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star size={9} className="fill-white stroke-none" />
                <span className="text-white text-[10px] font-bold">{r.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
