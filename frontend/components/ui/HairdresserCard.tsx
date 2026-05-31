import Link from 'next/link';
import Image from 'next/image';
import type { ApiHairdresserProfile } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';

export default function HairdresserCard({ hairdresser }: { hairdresser: ApiHairdresserProfile }) {
  const banner = resolveMediaUrl(hairdresser.banner_image);
  const avatar = resolveMediaUrl(hairdresser.user.avatar);
  const name = hairdresser.user.name;
  const hasRating = hairdresser.reviews_count > 0;

  return (
    <Link href={`/coiffeur/${hairdresser.slug}`} className="block group">
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900">

        {/* Image de fond (bannière ou fallback) */}
        {banner ? (
          <Image
            src={banner}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          />
        ) : avatar ? (
          /* Fallback : avatar centré sur fond sombre */
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
            <div className="relative w-20 h-20 rounded-full overflow-hidden opacity-60 group-hover:opacity-75 transition-opacity duration-500">
              <Image
                src={avatar}
                alt={name}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          </div>
        ) : (
          /* Fallback : initiale sur fond sombre avec texture subtile */
          <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
            <span className="text-5xl font-bold text-white/20 select-none">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

        {/* Badge vérifié */}
        {hairdresser.is_verified && (
          <div className="absolute top-3 right-3">
            <div className="w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
        )}

        {/* Contenu bas de carte */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          {/* Spécialités */}
          {hairdresser.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {hairdresser.specialties.slice(0, 2).map((s) => (
                <span
                  key={s.slug}
                  className="text-[9px] font-semibold text-white/85 bg-white/15 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-full tracking-[0.1em] uppercase"
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}

          {/* Nom + Ville + Note */}
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-[14px] leading-tight truncate">{name}</h3>
              {hairdresser.city && (
                <p className="text-white/55 text-[11px] mt-0.5 truncate">{hairdresser.city}</p>
              )}
            </div>
            {hasRating && (
              <div className="text-right flex-shrink-0">
                <p className="text-white font-bold text-[15px] leading-none">
                  {hairdresser.avg_rating}
                </p>
                <p className="text-white/45 text-[9px] mt-0.5">
                  {hairdresser.reviews_count} avis
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </Link>
  );
}
