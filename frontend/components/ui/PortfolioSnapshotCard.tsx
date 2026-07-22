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
        className="flex items-center gap-4 bg-white rounded-2xl border border-dashed border-neutral-200 p-5 hover:border-neutral-400 transition-colors"
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

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-50">
        <p className="text-sm font-bold text-neutral-900">Portfolio</p>
        <Link href="/pro/portfolio" className="text-neutral-300 hover:text-neutral-600 transition-colors">
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4 pt-4">
        <div className="bg-neutral-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-neutral-900 leading-none">{posts.length}</p>
          <p className="text-[9px] text-neutral-400 font-medium mt-1.5 uppercase tracking-wide">Réalisations</p>
        </div>
        <div className="bg-neutral-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-neutral-900 leading-none flex items-center justify-center gap-1">
            <Heart size={13} className="text-red-400" />{totalLikes}
          </p>
          <p className="text-[9px] text-neutral-400 font-medium mt-1.5 uppercase tracking-wide">J&apos;aime reçus</p>
        </div>
      </div>

      {dominantSpecialty && (
        <p className="mx-4 mt-3 text-xs text-neutral-400">
          Spécialité dominante : <span className="font-semibold text-neutral-600">{dominantSpecialty}</span>
        </p>
      )}

      {bestPost && (bestPost.likes_count ?? 0) > 0 && (
        <div className="mx-4 mt-2.5 flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5">
          <Star size={13} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Meilleure réalisation : <span className="font-semibold">{bestPost.likes_count} j&apos;aime</span>
          </p>
        </div>
      )}

      <div className="p-3 grid grid-cols-3 gap-2 mt-1">
        {posts.slice(0, 5).map((post) => {
          const imgUrl = resolvePostImage(post);
          return (
            <Link key={post.id} href="/pro/portfolio">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100">
                {imgUrl
                  ? <Image src={imgUrl} alt="" fill className="object-cover hover:scale-105 transition-transform duration-300" sizes="80px" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="text-neutral-300" /></div>
                }
              </div>
            </Link>
          );
        })}
        <Link href="/pro/portfolio">
          <div className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center hover:border-neutral-400 transition-colors">
            <Plus size={18} className="text-neutral-300" />
          </div>
        </Link>
      </div>
    </div>
  );
}
