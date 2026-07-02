'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import type { ApiPost, ApiHairdresserProfile, ApiUser } from '@/lib/types';
import { getAfterImage, resolveMediaUrl } from '@/lib/types';
import { savedPosts } from '@/lib/api';

interface Props {
  post: ApiPost;
  hairdresser?: ApiHairdresserProfile & { user: ApiUser };
  /** 'portrait' = aspect-[3/4], 'square' = aspect-square */
  aspect?: 'portrait' | 'square';
  /** Indique si le bouton coeur doit être affiché (uniquement si user connecté) */
  showSave?: boolean;
}

export default function FeedPostCard({ post, hairdresser: hdProp, aspect = 'portrait', showSave = false }: Props) {
  const hd        = hdProp ?? post.hairdresser;
  const afterUrl  = resolveMediaUrl(getAfterImage(post));
  const slug      = hd?.slug ?? '';
  const name      = hd?.user?.name ?? '';
  const specialty = post.specialty?.name ?? '';

  const [saved, setSaved] = useState(post.saved_by_user ?? false);
  const [saving, setSaving] = useState(false);

  const aspectCls = aspect === 'square' ? 'aspect-square' : 'aspect-[3/4]';

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    const next = !saved;
    setSaved(next);
    try {
      if (next) {
        await savedPosts.save(post.id);
      } else {
        await savedPosts.unsave(post.id);
      }
    } catch {
      setSaved(!next);
    } finally {
      setSaving(false);
    }
  }, [saved, saving, post.id]);

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

      {/* Bouton coeur */}
      {showSave && (
        <button
          onClick={handleSave}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
          style={{ background: saved ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.35)' }}
          aria-label={saved ? 'Retirer des inspirations' : 'Sauvegarder'}
        >
          <Heart
            size={14}
            className={`transition-all duration-200 ${saved ? 'text-neutral-900 fill-neutral-900' : 'text-white'}`}
            strokeWidth={saved ? 0 : 2}
          />
        </button>
      )}

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

  // Par défaut : ouvre le feed vertical TikTok. Depuis un profil coiffeur,
  // les PostCard (non FeedPostCard) gardent leur lien vers /realisation/[id].
  return (
    <Link href={`/app/feed?from=${post.id}`} className="block">
      {card}
    </Link>
  );
}
