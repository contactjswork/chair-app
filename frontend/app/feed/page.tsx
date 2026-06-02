'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, Heart, Tag, MapPin, ImageIcon, X } from 'lucide-react';
import type { ApiPost, ApiHairdresserProfile, ApiUser, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAllImagesRaw, formatDate } from '@/lib/types';
import { posts as postsApi } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Carrousel interne (horizontal, sans indicateur externe) ─────────

function InlineCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCurrent(Math.round(el.scrollLeft / el.offsetWidth));
  }

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="relative w-full h-full">
        <Image src={images[0]} alt={alt} fill className="object-cover" sizes="100vw" priority />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 flex overflow-x-auto no-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {images.map((src, i) => (
          <div key={i} className="relative flex-shrink-0 w-full h-full" style={{ scrollSnapAlign: 'start' }}>
            <Image src={src} alt={`${alt} ${i + 1}`} fill className="object-cover" sizes="100vw" priority={i === 0} />
          </div>
        ))}
      </div>
      <div className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums flex items-center gap-1">
        <ImageIcon size={10} />
        {current + 1}/{images.length}
      </div>
      <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1">
        {images.map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white' : 'bg-white/35'}`} />
        ))}
      </div>
    </div>
  );
}

// ── Bouton like par carte ────────────────────────────────────────────

function CardLikeButton({ postId, initialLikes }: { postId: number; initialLikes: number }) {
  const [liked,   setLiked]   = useState(false);
  const [count,   setCount]   = useState(initialLikes);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!getStoredToken()) { window.location.href = '/connexion'; return; }
    if (pending) return;
    setPending(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);
    try {
      const res = await postsApi.toggleLike(postId);
      setLiked(res.liked);
      setCount(res.likes_count);
    } catch {
      setLiked(wasLiked);
      setCount(initialLikes);
    } finally {
      setPending(false);
    }
  }

  return (
    <button onClick={toggle} disabled={pending} className="flex items-center gap-1.5">
      <Heart
        size={22}
        strokeWidth={1.5}
        className={`transition-all ${liked ? 'fill-white stroke-white' : 'stroke-white'}`}
      />
      {count > 0 && <span className="text-white text-xs font-medium">{count}</span>}
    </button>
  );
}

// ── Carte verticale d'un post (plein écran) ──────────────────────────

function FeedCard({
  post,
  onClose,
}: {
  post: ApiPost;
  onClose: () => void;
}) {
  const hd = post.hairdresser as (ApiHairdresserProfile & { user: ApiUser }) | undefined;
  const images = getAllImagesRaw(post).map((url) => resolveMediaUrl(url) ?? '').filter(Boolean);
  const avatarUrl = resolveMediaUrl(hd?.user?.avatar ?? null);

  return (
    <div className="relative w-full h-[100svh] bg-black flex flex-col overflow-hidden snap-start flex-shrink-0">
      {/* Image zone (takes ~65% of height) */}
      <div className="relative flex-1 overflow-hidden">
        <InlineCarousel images={images} alt={post.description || hd?.user?.name || ''} />
        {/* Gradient overlay bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      </div>

      {/* Info zone */}
      <div className="flex-none px-4 pt-3 pb-4 bg-black">
        {/* Hairdresser */}
        {hd && (
          <Link href={`/coiffeur/${hd.slug}`} className="flex items-center gap-2.5 mb-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={hd.user.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-300">
                  {hd.user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-tight">{hd.user.name}</p>
              {hd.city && (
                <p className="text-[11px] text-white/50 flex items-center gap-0.5 mt-0.5">
                  <MapPin size={10} />
                  {hd.city}
                </p>
              )}
            </div>
          </Link>
        )}

        {/* Specialty + description */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {post.specialty && (
              <Link href={`/rechercher?specialty=${post.specialty.slug}`}
                className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.15em] uppercase text-white/60 mb-1.5">
                <Tag size={9} />
                {post.specialty.name}
              </Link>
            )}
            {post.description && (
              <p className="text-[13px] text-white/80 leading-relaxed line-clamp-2">{post.description}</p>
            )}
            <p className="text-[10px] text-white/35 mt-1.5">{formatDate(post.created_at)}</p>
          </div>

          {/* Like */}
          <div className="flex-shrink-0 pt-1">
            <CardLikeButton postId={post.id} initialLikes={post.likes_count} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page feed ────────────────────────────────────────────────────────

function FeedContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const fromId       = searchParams.get('from');

  const [feedPosts, setFeedPosts] = useState<ApiPost[]>([]);
  const [loading,   setLoading]   = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/feed?per_page=50`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: PaginatedResponse<ApiPost>) => setFeedPosts(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Scroll to the starting post
  useEffect(() => {
    if (!fromId || feedPosts.length === 0) return;
    const index = feedPosts.findIndex((p) => String(p.id) === fromId);
    if (index <= 0) return;
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = index * window.innerHeight;
      }
    });
  }, [fromId, feedPosts]);

  function handleClose() {
    if (window.history.length > 1) router.back();
    else router.push('/');
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white/40 text-sm">Chargement...</div>
      </div>
    );
  }

  if (feedPosts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-4">
        <p className="text-white/50 text-sm">Aucune publication</p>
        <button onClick={handleClose} className="text-white text-sm underline">Retour</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-safe pt-4 pb-3 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={handleClose}
          className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Découvrir</span>
        </button>
        <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/40">CHAIR</span>
      </div>

      {/* Vertical scroll feed */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-auto no-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {feedPosts.map((post) => (
          <FeedCard key={post.id} post={post} onClose={handleClose} />
        ))}
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white/40 text-sm">Chargement...</div>
      </div>
    }>
      <FeedContent />
    </Suspense>
  );
}
