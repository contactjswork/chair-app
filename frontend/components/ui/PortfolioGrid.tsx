'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ApiPost } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';

const INITIAL_COUNT = 6;

function PortfolioItem({ post }: { post: ApiPost }) {
  const url = resolveMediaUrl(getAfterImage(post));
  if (!url) return null;
  return (
    <Link
      href={`/realisation/${post.id}`}
      className="relative aspect-square overflow-hidden bg-neutral-100 group block"
    >
      <Image
        src={url}
        alt={post.description ?? 'Réalisation'}
        fill
        className="object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
        sizes="(max-width: 768px) 33vw, 224px"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-300 flex flex-col justify-end p-2">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 space-y-0.5">
          {post.specialty && (
            <span className="block text-[9px] text-white font-semibold tracking-[0.15em] uppercase">
              {post.specialty.name}
            </span>
          )}
          {post.type === 'before_after' && (
            <span className="block text-[9px] text-white/65 font-medium">Avant / Après</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function FeaturedItem({ post }: { post: ApiPost }) {
  const url = resolveMediaUrl(getAfterImage(post));
  if (!url) return null;
  return (
    <Link
      href={`/realisation/${post.id}`}
      className="col-span-2 row-span-2 relative aspect-square overflow-hidden bg-neutral-100 group block"
    >
      <Image
        src={url}
        alt={post.description ?? 'Réalisation à la une'}
        fill
        priority
        className="object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
        sizes="(max-width: 768px) 67vw, 450px"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {post.specialty && (
          <span className="block text-[10px] text-white/75 font-semibold tracking-[0.15em] uppercase mb-0.5">
            {post.specialty.name}
          </span>
        )}
        {post.type === 'before_after' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-white/60 font-medium bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full">
            Avant / Après
          </span>
        )}
      </div>
    </Link>
  );
}

interface Props {
  posts: ApiPost[];
}

export default function PortfolioGrid({ posts }: Props) {
  const [expanded, setExpanded] = useState(false);

  const visible   = expanded ? posts : posts.slice(0, INITIAL_COUNT);
  const remaining = posts.length - INITIAL_COUNT;
  const showBtn   = !expanded && posts.length >= INITIAL_COUNT;

  if (posts.length === 0) {
    return (
      <div className="mx-4 md:mx-0 bg-neutral-50 border border-neutral-100 rounded-2xl py-14 text-center">
        <p className="text-[13px] text-neutral-400">Aucune réalisation pour l&apos;instant.</p>
      </div>
    );
  }

  if (posts.length === 1) {
    const url = resolveMediaUrl(getAfterImage(posts[0]));
    if (!url) return null;
    return (
      <Link href={`/realisation/${posts[0].id}`} className="relative block aspect-[4/3] overflow-hidden bg-neutral-100 group md:rounded-2xl">
        <Image src={url} alt="Réalisation" fill priority className="object-cover group-hover:scale-[1.03] transition-transform duration-700" sizes="100vw" />
      </Link>
    );
  }

  if (posts.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-px bg-neutral-100 overflow-hidden md:rounded-2xl">
        {posts.map((p) => <PortfolioItem key={p.id} post={p} />)}
      </div>
    );
  }

  // 3+ posts : featured + grille 3-col
  return (
    <div>
      <div className="grid grid-cols-3 gap-px bg-neutral-100 overflow-hidden md:rounded-2xl">
        <FeaturedItem post={visible[0]} />
        {visible[1] && <PortfolioItem post={visible[1]} />}
        {visible[2] && <PortfolioItem post={visible[2]} />}
        {visible.slice(3).map((p) => (
          <PortfolioItem key={p.id} post={p} />
        ))}
      </div>

      {showBtn && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full mt-px py-3.5 text-[13px] font-semibold text-neutral-600 bg-neutral-50 hover:bg-neutral-100 transition-colors border-t border-neutral-100 md:rounded-b-2xl"
        >
          Voir les {remaining} réalisation{remaining > 1 ? 's' : ''} suivante{remaining > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
