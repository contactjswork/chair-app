'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Camera, ImageIcon, Plus, Heart, Star } from 'lucide-react';
import { getAfterImage } from '@/lib/types';
import type { ApiPost } from '@/lib/types';

interface Props {
  posts: ApiPost[];
}

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api$/, '');

function resolvePostImage(post: ApiPost): string | null {
  const img = getAfterImage(post);
  if (!img) return null;
  return img.startsWith('/storage/') ? `${BASE}${img}` : img;
}

export default function PortfolioSnapshotCard({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <Link href="/pro/portfolio"
        className="flex items-center gap-4 bg-white rounded-[22px] p-5 ring-1 ring-dashed ring-neutral-200 hover:ring-neutral-400 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
          <Camera size={20} className="text-neutral-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900">Aucune réalisation</p>
          <p className="text-xs text-neutral-400 mt-0.5">Publiez des photos pour construire votre portfolio</p>
        </div>
        <ChevronRight size={16} className="text-neutral-300" />
      </Link>
    );
  }

  const totalLikes = posts.reduce((acc, p) => acc + (p.likes_count ?? 0), 0);
  const bestPost = posts.reduce((best, p) => (p.likes_count ?? 0) > (best?.likes_count ?? -1) ? p : best, null as ApiPost | null);

  // Spécialité dominante — celle qui revient le plus souvent parmi les
  // réalisations publiées, pas une donnée séparée à maintenir.
  const specialtyCounts = new Map<string, number>();
  for (const p of posts) {
    if (p.specialty?.name) specialtyCounts.set(p.specialty.name, (specialtyCounts.get(p.specialty.name) ?? 0) + 1);
  }
  const dominantSpecialty = [...specialtyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Spécialité dominante + meilleure réalisation fusionnées en une seule
  // ligne de repère (au lieu d'un texte + un bandeau ambre séparés) — même
  // donnée réelle, une seule surface à lire.
  const bestLikes = bestPost && (bestPost.likes_count ?? 0) > 0 ? bestPost.likes_count : null;
  const hasHighlight = dominantSpecialty || bestLikes;

  return (
    <div className="bg-white rounded-[22px] shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-50">
        <p className="text-sm font-bold text-neutral-900">Portfolio</p>
        <Link href="/pro/portfolio" className="text-neutral-300 hover:text-neutral-600 transition-colors">
          <ChevronRight size={16} />
        </Link>
      </div>

      {/* Deux chiffres en une ligne (au lieu de deux pavés) et les vignettes
          en bande horizontale : même contenu, un tiers de la hauteur — c'est
          la section qui pesait le plus lourd dans le scroll du cockpit. */}
      <div className="px-5 pt-3 flex items-center gap-2 text-xs text-neutral-500">
        <span><span className="font-bold text-neutral-900">{posts.length}</span> réalisation{posts.length > 1 ? 's' : ''}</span>
        <span className="text-neutral-200">·</span>
        <span className="flex items-center gap-1">
          <Heart size={12} className="text-red-400" />
          <span className="font-bold text-neutral-900">{totalLikes}</span> j&apos;aime
        </span>
      </div>

      {hasHighlight && (
        <p className="px-5 mt-1.5 text-xs text-neutral-400 flex items-center gap-1.5">
          {bestLikes && <Star size={12} className="text-amber-500 flex-shrink-0" />}
          {dominantSpecialty && <span className="font-semibold text-neutral-600">{dominantSpecialty}</span>}
          {dominantSpecialty && bestLikes && <span className="text-neutral-300">·</span>}
          {bestLikes && <span>meilleure pub <span className="font-semibold text-neutral-600">{bestLikes} j&apos;aime</span></span>}
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-4">
        {posts.slice(0, 8).map((post) => {
          const imgUrl = resolvePostImage(post);
          return (
            <Link key={post.id} href="/pro/portfolio" className="flex-shrink-0">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-100">
                {imgUrl
                  ? <Image src={imgUrl} alt="" fill className="object-cover hover:scale-105 transition-transform duration-300" sizes="80px" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="text-neutral-300" /></div>
                }
              </div>
            </Link>
          );
        })}
        <Link href="/pro/portfolio" className="flex-shrink-0">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center hover:border-neutral-400 transition-colors">
            <Plus size={18} className="text-neutral-300" />
          </div>
        </Link>
      </div>
    </div>
  );
}
