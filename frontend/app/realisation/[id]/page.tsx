import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import type { ApiPost, ApiHairdresserProfile, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage, getBeforeImage, formatDate } from '@/lib/types';
import { ChevronLeft, ChevronRight, Clock, Tag, MapPin, Heart } from 'lucide-react';

const API = 'http://localhost:8000/api';

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
  const hairdresserSlug = hairdresser.slug;

  // Charge les autres posts pour la navigation
  const allPosts = await getSiblingPosts(hairdresserSlug);
  const currentIndex = allPosts.findIndex((p) => p.id === post.id);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  const afterUrl = resolveMediaUrl(getAfterImage(post));
  const beforeUrl = resolveMediaUrl(getBeforeImage(post));
  const avatarUrl = resolveMediaUrl(hairdresser.user.avatar);
  const hasBefore = !!beforeUrl && post.type === 'before_after';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-20">

        {/* ── Header navigation ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <Link
            href={`/coiffeur/${hairdresserSlug}`}
            className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft size={18} />
            <span className="font-medium">{hairdresser.user.name}</span>
          </Link>

          {/* Navigation prev / next */}
          <div className="flex items-center gap-1">
            {prevPost ? (
              <Link
                href={`/realisation/${prevPost.id}`}
                className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
                aria-label="Réalisation précédente"
              >
                <ChevronLeft size={18} />
              </Link>
            ) : (
              <span className="p-2 text-neutral-200">
                <ChevronLeft size={18} />
              </span>
            )}
            <span className="text-[11px] text-neutral-400 font-medium tabular-nums min-w-[3rem] text-center">
              {currentIndex + 1} / {allPosts.length}
            </span>
            {nextPost ? (
              <Link
                href={`/realisation/${nextPost.id}`}
                className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
                aria-label="Réalisation suivante"
              >
                <ChevronRight size={18} />
              </Link>
            ) : (
              <span className="p-2 text-neutral-200">
                <ChevronRight size={18} />
              </span>
            )}
          </div>
        </div>

        {/* ── Image principale ── */}
        {hasBefore ? (
          /* Avant / Après côte à côte */
          <div className="flex gap-px bg-neutral-900">
            <div className="relative flex-1 aspect-square bg-neutral-900">
              <Image
                src={beforeUrl!}
                alt="Avant"
                fill
                priority
                className="object-cover"
                sizes="50vw"
              />
              <div className="absolute bottom-2 left-2">
                <span className="text-[9px] tracking-[0.15em] uppercase font-semibold text-white/70 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
                  Avant
                </span>
              </div>
            </div>
            <div className="relative flex-1 aspect-square bg-neutral-900">
              <Image
                src={afterUrl!}
                alt="Après"
                fill
                priority
                className="object-cover"
                sizes="50vw"
              />
              <div className="absolute bottom-2 right-2">
                <span className="text-[9px] tracking-[0.15em] uppercase font-semibold text-white/70 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
                  Après
                </span>
              </div>
            </div>
          </div>
        ) : afterUrl ? (
          /* Image simple */
          <div className="relative w-full aspect-square bg-neutral-100">
            <Image
              src={afterUrl}
              alt={post.description || 'Réalisation'}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
            />
          </div>
        ) : null}

        {/* ── Infos réalisation ── */}
        <div className="px-4 pt-5 pb-4 border-b border-neutral-100">

          {/* Coiffeur */}
          <Link href={`/coiffeur/${hairdresserSlug}`} className="flex items-center gap-3 mb-4 group">
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

          {/* Spécialité */}
          {post.specialty && (
            <div className="mb-3">
              <Link
                href={`/rechercher?specialty=${post.specialty.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase bg-neutral-900 text-white px-3 py-1.5 rounded-full hover:bg-neutral-700 transition-colors"
              >
                <Tag size={11} />
                {post.specialty.name}
              </Link>
            </div>
          )}

          {/* Description */}
          {post.description && (
            <p className="text-sm text-neutral-700 leading-relaxed mb-4">{post.description}</p>
          )}

          {/* Méta : durée + prix */}
          {(post.duration_minutes || post.price_indication) && (
            <div className="flex items-center gap-4 text-sm text-neutral-500">
              {post.duration_minutes && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {post.duration_minutes} min
                </span>
              )}
              {post.price_indication && (
                <span className="font-semibold text-neutral-900">
                  {post.price_indication} €
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Engagement ── */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Heart size={16} strokeWidth={1.5} />
            <span className="text-sm">
              {post.likes_count > 0 ? `${post.likes_count} j'aime` : "Soyez le premier à aimer"}
            </span>
          </div>
          <span className="text-xs text-neutral-400">{formatDate(post.created_at)}</span>
        </div>

        {/* ── Thumbnails navigation — autres réalisations du coiffeur ── */}
        {allPosts.length > 1 && (
          <div className="px-4 pt-5">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
              Autres réalisations
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {allPosts.filter((p) => p.id !== post.id).map((p) => {
                const thumb = resolveMediaUrl(getAfterImage(p));
                return (
                  <Link
                    key={p.id}
                    href={`/realisation/${p.id}`}
                    className="flex-shrink-0 relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 hover:opacity-80 transition-opacity"
                  >
                    {thumb && (
                      <Image
                        src={thumb}
                        alt={p.description || 'Réalisation'}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
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
