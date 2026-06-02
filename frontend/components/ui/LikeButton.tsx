'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { posts } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';

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
      window.location.href = '/connexion';
      return;
    }
    if (pending) return;
    setPending(true);

    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);

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
      <span className={`${textCls} text-neutral-500 group-hover:text-neutral-900 transition-colors`}>
        {count > 0 ? `${count} j'aime` : "J'aimer"}
      </span>
    </button>
  );
}
