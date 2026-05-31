import Link from 'next/link';
import Image from 'next/image';
import type { ApiPost, ApiHairdresserProfile, ApiUser } from '@/lib/types';
import { getBeforeImage, getAfterImage, resolveMediaUrl } from '@/lib/types';

interface Props {
  post: ApiPost;
  hairdresser?: ApiHairdresserProfile & { user: ApiUser };
}

export default function PostCard({ post, hairdresser: hairdresserProp }: Props) {
  const beforeImage = resolveMediaUrl(getBeforeImage(post));
  const afterImage = resolveMediaUrl(getAfterImage(post));
  const isBeforeAfter = post.type === 'before_after' && beforeImage && afterImage;

  const hd = hairdresserProp ?? post.hairdresser;
  const hairdresserName = hd?.user?.name ?? '';
  const hairdresserAvatar = resolveMediaUrl(hd?.user?.avatar ?? null);
  const hairdresserCity = hd?.city ?? '';
  const hairdresserSlug = hd?.slug ?? '';
  const specialtyName = post.specialty?.name ?? '';

  const cardContent = (
    <div className="rounded-2xl overflow-hidden bg-neutral-100">
      {isBeforeAfter ? (
        <div className="relative">
          <div className="grid grid-cols-2 gap-px bg-neutral-900">
            <div className="relative aspect-square overflow-hidden">
              <Image src={beforeImage!} alt="Avant" fill className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden">
              <Image src={afterImage!} alt="Après" fill className="object-cover" />
            </div>
          </div>
          <div className="absolute top-3 left-3">
            <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-white/70">Avant</span>
          </div>
          <div className="absolute top-3 right-3 text-right">
            <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-white/70">Après</span>
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <span className="text-[9px] font-semibold tracking-[0.12em] uppercase text-white bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
              Transformation
            </span>
          </div>
        </div>
      ) : afterImage ? (
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={afterImage}
            alt={specialtyName || 'Réalisation'}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
          />
        </div>
      ) : (
        <div className="aspect-square bg-neutral-200 flex items-center justify-center">
          <span className="text-xs text-neutral-400">Aucune photo</span>
        </div>
      )}

      <div className="bg-white px-4 pt-3 pb-4">
        {hairdresserName && (
          <div className="flex items-center gap-2.5 mb-2">
            <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100">
              {hairdresserAvatar && (
                <Image src={hairdresserAvatar} alt={hairdresserName} fill className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-neutral-900 leading-none truncate">{hairdresserName}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">{hairdresserCity}</p>
            </div>
            {specialtyName && (
              <span className="text-[10px] font-medium text-neutral-400 tracking-wide uppercase flex-shrink-0">
                {specialtyName}
              </span>
            )}
          </div>
        )}

        {!hairdresserName && specialtyName && (
          <p className="text-[10px] font-semibold tracking-wide uppercase text-neutral-400 mb-2">{specialtyName}</p>
        )}

        {post.description && (
          <p className="text-[12px] text-neutral-500 leading-relaxed line-clamp-2 mb-3">
            {post.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-neutral-400">{post.likes_count} j'aime</span>
            <span className="text-[11px] text-neutral-300">·</span>
            <span className="text-[11px] text-neutral-400">{post.views_count} vues</span>
          </div>
          {post.price_indication && (
            <span className="text-[12px] font-semibold text-neutral-800">à partir de {post.price_indication} €</span>
          )}
        </div>
      </div>
    </div>
  );

  if (!hairdresserSlug) {
    return <div className="group">{cardContent}</div>;
  }

  return (
    <Link href={`/coiffeur/${hairdresserSlug}`} className="block group">
      {cardContent}
    </Link>
  );
}
