'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { posts } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';
import { hapticLight } from '@/lib/haptics';

interface Props {
  postId: number;
  initialLikes: number;
  initialLiked?: boolean;
  size?: 'sm' | 'md';
}

export default function LikeButton({ postId, initialLikes, initialLiked = false, size = 'md' }: Props) {
  const [liked,   setLiked]   = useState(initialLiked);
  const [count,   setCount]   = useState(initialLikes);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!getStoredToken()) {
      // Reprise de parcours : après connexion, on revient sur la page où le
      // like a été tenté (fiche réalisation, feed) au lieu de l'accueil.
      const here = window.location.pathname + window.location.search;
      window.location.href = `/connexion?returnTo=${encodeURIComponent(here)}`;
      return;
    }
    if (pending) return;
    setPending(true);

    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);
    if (!wasLiked) void hapticLight(); // au like uniquement, pas au retrait — no-op hors natif

    try {
      const res = await posts.toggleLike(postId);
      setLiked(res.liked);
      setCount(res.likes_count);
    } catch {
      setLiked(wasLiked);
      setCount(count);
    } finally {
      setPending(false);
    }
  }

  const iconSize = size === 'sm' ? 16 : 20;
  const textCls  = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="flex items-center gap-2 group transition-opacity disabled:opacity-60"
      aria-label={liked ? 'Ne plus aimer' : "J'aime"}
    >
      <Heart
        size={iconSize}
        strokeWidth={1.5}
        className={`transition-all duration-150 ${
          liked
            ? 'fill-neutral-900 stroke-neutral-900'
            : 'stroke-neutral-500 group-hover:stroke-neutral-900'
        }`}
      />
      {count > 0 && (
        <span className={`${textCls} text-neutral-500 group-hover:text-neutral-900 transition-colors tabular-nums`}>
          {count}
        </span>
      )}
    </button>
  );
}
