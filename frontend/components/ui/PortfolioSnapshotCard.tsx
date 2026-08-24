'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ImageIcon, Plus } from 'lucide-react';
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

/**
 * Le portfolio du cockpit : les images d'abord, les chiffres en une ligne
 * dessous. Avant, deux pavés gris de statistiques passaient devant les photos
 * et la grille 3 colonnes mangeait un demi-écran — c'était la section la plus
 * lourde du scroll, pour le contenu le plus visuel du produit.
 */
export default function PortfolioSnapshotCard({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <Link href="/pro/portfolio" className="flex items-center gap-4 bg-neutral-50 rounded-[20px] px-5 py-5 hover:bg-neutral-100/80 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-semibold text-neutral-900 leading-snug">Aucune réalisation</p>
          <p className="text-[13px] text-neutral-400 mt-1">Vos photos sont ce que les clients regardent en premier.</p>
        </div>
        <ArrowRight size={18} className="text-neutral-300 flex-shrink-0" />
      </Link>
    );
  }

  const totalLikes = posts.reduce((acc, p) => acc + (p.likes_count ?? 0), 0);

  // Spécialité dominante — celle qui revient le plus souvent parmi les
  // réalisations publiées, pas une donnée séparée à maintenir.
  const specialtyCounts = new Map<string, number>();
  for (const p of posts) {
    if (p.specialty?.name) specialtyCounts.set(p.specialty.name, (specialtyCounts.get(p.specialty.name) ?? 0) + 1);
  }
  const dominantSpecialty = [...specialtyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 md:-mx-6 md:px-6">
        {posts.slice(0, 10).map((post) => {
          const imgUrl = resolvePostImage(post);
          return (
            <Link key={post.id} href="/pro/portfolio" className="flex-shrink-0">
              <div className="relative w-[104px] h-[104px] rounded-[16px] overflow-hidden bg-neutral-100">
                {imgUrl
                  ? <Image src={imgUrl} alt="" fill className="object-cover" sizes="104px" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={16} className="text-neutral-300" /></div>
                }
              </div>
            </Link>
          );
        })}
        <Link href="/pro/portfolio" className="flex-shrink-0">
          <div className="w-[104px] h-[104px] rounded-[16px] bg-neutral-50 flex items-center justify-center hover:bg-neutral-100 transition-colors">
            <Plus size={20} className="text-neutral-300" strokeWidth={1.75} />
          </div>
        </Link>
      </div>

      <p className="mt-3 text-[13px] text-neutral-400">
        <span className="text-neutral-900 font-medium tabular-nums">{posts.length}</span>{' '}réalisation{posts.length > 1 ? 's' : ''}
        <span className="mx-2 text-neutral-200">·</span>
        <span className="text-neutral-900 font-medium tabular-nums">{totalLikes}</span>{' '}j&apos;aime
        {dominantSpecialty && <><span className="mx-2 text-neutral-200">·</span>{dominantSpecialty}</>}
      </p>
    </div>
  );
}
