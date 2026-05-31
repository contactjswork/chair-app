import Link from 'next/link';
import Image from 'next/image';
import type { ApiPost, ApiHairdresserProfile, ApiUser } from '@/lib/types';
import { getAfterImage, resolveMediaUrl } from '@/lib/types';

interface Props {
  post: ApiPost;
  hairdresser?: ApiHairdresserProfile & { user: ApiUser };
  /** 'portrait' = aspect-[3/4], 'square' = aspect-square */
  aspect?: 'portrait' | 'square';
}

export default function FeedPostCard({ post, hairdresser: hdProp, aspect = 'portrait' }: Props) {
  const hd        = hdProp ?? post.hairdresser;
  const afterUrl  = resolveMediaUrl(getAfterImage(post));
  const slug      = hd?.slug ?? '';
  const name      = hd?.user?.name ?? '';
  const specialty = post.specialty?.name ?? '';

  const aspectCls = aspect === 'square' ? 'aspect-square' : 'aspect-[3/4]';

  const card = (
    <div className={`relative ${aspectCls} rounded-xl md:rounded-2xl overflow-hidden bg-neutral-900 group`}>
      {afterUrl ? (
        <Image
          src={afterUrl}
          alt={specialty || name}
          fill
          className="object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
          sizes="(max-width: 768px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-800" />
      )}

      {/* Gradient protection */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      {/* Overlay info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {specialty && (
          <p className="text-[9px] font-semibold tracking-[0.2em] uppercase text-white/60 mb-0.5 leading-none">
            {specialty}
          </p>
        )}
        {name && (
          <p className="text-[12px] font-semibold text-white leading-tight truncate">{name}</p>
        )}
      </div>
    </div>
  );

  if (!slug) return <div>{card}</div>;

  return (
    <Link href={`/coiffeur/${slug}`} className="block">
      {card}
    </Link>
  );
}
