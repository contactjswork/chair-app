import Link from 'next/link';
import Image from 'next/image';
import type { ApiHairdresserProfile } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';
import { formatDistance } from '@/hooks/useGeolocation';
import { Star } from 'lucide-react';

export default function HairdresserCard({
  hairdresser,
  distanceKm,
}: {
  hairdresser: ApiHairdresserProfile;
  distanceKm?: number;
}) {
  const banner = resolveMediaUrl(hairdresser.banner_image);
  const avatar = resolveMediaUrl(hairdresser.user.avatar);
  const name   = hairdresser.user.name;
  const hasRating = hairdresser.reviews_count > 0;

  return (
    <Link href={`/coiffeur/${hairdresser.slug}`} className="block group">
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900">

        {/* ── Fond : bannière floutée (ou couleur neutre si absente) ── */}
        {banner ? (
          <Image
            src={banner}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover scale-110 blur-sm brightness-50 group-hover:brightness-60 transition-all duration-500"
          />
        ) : avatar ? (
          <Image
            src={avatar}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover scale-110 blur-sm brightness-40 group-hover:brightness-50 transition-all duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
        )}

        {/* Overlay gradient doux */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />

        {/* ── Badge vérifié ── */}
        {hairdresser.is_verified && (
          <div className="absolute top-3 right-3 z-10">
            <div className="w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
        )}

        {/* ── Photo de profil en rond — centre de la carte ── */}
        <div className="absolute inset-0 flex items-center justify-center pb-10">
          {avatar ? (
            <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/30 shadow-2xl group-hover:ring-white/60 group-hover:scale-105 transition-all duration-400">
              <Image
                src={avatar}
                alt={name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-neutral-700 ring-2 ring-white/20 shadow-2xl flex items-center justify-center">
              <span className="text-3xl font-bold text-white/40 select-none">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* ── Contenu bas ── */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          {/* Spécialités */}
          {hairdresser.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {hairdresser.specialties.slice(0, 2).map((s) => (
                <span
                  key={s.slug}
                  className="text-[8px] font-bold text-white/80 bg-white/10 backdrop-blur-sm border border-white/15 px-2 py-0.5 rounded-full tracking-[0.12em] uppercase"
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}

          {/* Nom + Ville + Note */}
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-white font-bold text-[13px] leading-tight truncate">{name}</h3>
              {distanceKm != null ? (
                <p className="text-white/60 text-[10px] mt-0.5 font-semibold">à {formatDistance(distanceKm)}</p>
              ) : hairdresser.city ? (
                <p className="text-white/50 text-[10px] mt-0.5 truncate">{hairdresser.city}</p>
              ) : null}
            </div>
            {hasRating && (
              <div className="flex-shrink-0 flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                <Star size={9} className="fill-white stroke-none" />
                <span className="text-white font-bold text-[11px] leading-none">
                  {parseFloat(hairdresser.avg_rating).toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </Link>
  );
}
