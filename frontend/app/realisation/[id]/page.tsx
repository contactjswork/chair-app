import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import PostCarousel from '@/components/ui/PostCarousel';
import LikeButton from '@/components/ui/LikeButton';
import ShareButton from '@/components/ui/ShareButton';
import type { ApiPost, ApiHairdresserProfile, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAllImagesRaw, formatDate } from '@/lib/types';
import { ChevronLeft, ChevronRight, Tag, MapPin, MessageCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

async function getPost(id: string): Promise<ApiPost | null> {
  const res = await fetch(`${API}/posts/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function getSiblingPosts(slug: string): Promise<ApiPost[]> {
  const res = await fetch(`${API}/hairdressers/${slug}/posts`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data: PaginatedResponse<ApiPost> = await res.json();
  return data.data;
}

export default async function RealisationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post || !post.hairdresser) notFound();

  const hairdresser = post.hairdresser as ApiHairdresserProfile & { user: typeof post.hairdresser.user };
  const slug = hairdresser.slug;

  const allPosts     = await getSiblingPosts(slug);
  const currentIndex = allPosts.findIndex((p) => p.id === post.id);
  const prevPost     = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost     = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  const images    = getAllImagesRaw(post).map((url) => resolveMediaUrl(url) ?? '').filter(Boolean);
  const avatarUrl = resolveMediaUrl(hairdresser.user.avatar);

  return (
    <AppShell>
      <div className="max-w-lg mx-auto pb-24">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <Link
            href={`/coiffeur/${slug}`}
            className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft size={18} />
            <span className="font-medium truncate max-w-[160px]">{hairdresser.user.name}</span>
          </Link>

          <div className="flex items-center gap-1">
            {prevPost ? (
              <Link href={`/realisation/${prevPost.id}`}
                className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
                aria-label="Réalisation précédente">
                <ChevronLeft size={18} />
              </Link>
            ) : (
              <span className="p-2 text-neutral-200"><ChevronLeft size={18} /></span>
            )}
            <span className="text-[11px] text-neutral-400 font-medium tabular-nums min-w-[3rem] text-center">
              {currentIndex + 1} / {allPosts.length}
            </span>
            {nextPost ? (
              <Link href={`/realisation/${nextPost.id}`}
                className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
                aria-label="Réalisation suivante">
                <ChevronRight size={18} />
              </Link>
            ) : (
              <span className="p-2 text-neutral-200"><ChevronRight size={18} /></span>
            )}
          </div>
        </div>

        {/* ── Carrousel photos ── */}
        <PostCarousel images={images} alt={post.description || hairdresser.user.name} aspectClass="aspect-square" />

        {/* ── Coiffeur ── */}
        <div className="px-4 pt-4 pb-3">
          <Link href={`/coiffeur/${slug}`} className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={hairdresser.user.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-sm font-bold text-neutral-500">
                    {hairdresser.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-600 transition-colors leading-tight">
                {hairdresser.user.name}
              </p>
              {hairdresser.city && (
                <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} />
                  {hairdresser.city}
                </p>
              )}
            </div>
          </Link>
        </div>

        {/* ── Interactions ── */}
        <div className="px-4 py-3 flex items-center gap-5 border-t border-b border-neutral-100">
          <LikeButton postId={post.id} initialLikes={post.likes_count} initialLiked={post.liked_by_user} />

          {/* Commentaires — architecture préparée */}
          <button className="flex items-center gap-2 text-neutral-400 cursor-default" disabled>
            <MessageCircle size={20} strokeWidth={1.5} />
            <span className="text-sm">Commentaires</span>
          </button>

          <ShareButton />
        </div>

        {/* ── Spécialité + description ── */}
        <div className="px-4 pt-4 pb-2">
          {post.specialty && (
            <Link
              href={`/rechercher?specialty=${post.specialty.slug}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.15em] uppercase bg-neutral-900 text-white px-3 py-1.5 rounded-full hover:bg-neutral-700 transition-colors mb-3"
            >
              <Tag size={10} />
              {post.specialty.name}
            </Link>
          )}

          {post.description && (
            <p className="text-[14px] text-neutral-700 leading-relaxed">{post.description}</p>
          )}

          <p className="text-[11px] text-neutral-400 mt-3">{formatDate(post.created_at)}</p>
        </div>

        {/* ── Autres réalisations du même coiffeur ── */}
        {allPosts.length > 1 && (
          <div className="px-4 pt-5">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
              Autres réalisations
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {allPosts.filter((p) => p.id !== post.id).map((p) => {
                const thumb = resolveMediaUrl(getAllImagesRaw(p)[0]);
                return (
                  <Link
                    key={p.id}
                    href={`/realisation/${p.id}`}
                    className="flex-shrink-0 relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 hover:opacity-80 transition-opacity"
                  >
                    {thumb && (
                      <Image src={thumb} alt={p.description || 'Réalisation'} fill className="object-cover" sizes="80px" />
                    )}
                    {getAllImagesRaw(p).length > 1 && (
                      <div className="absolute top-1 right-1 bg-black/50 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                        {getAllImagesRaw(p).length}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
