'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, Heart, Bookmark, Tag, MapPin, ImageIcon, X, Share2 } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import type { ApiPost, ApiHairdresserProfile, ApiUser, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAllImagesRaw, formatDate } from '@/lib/types';
import { posts as postsApi, savedPosts as savedPostsApi } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Carrousel horizontal interne ─────────────────────────────────────

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
      {/* Compteur */}
      <div className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
        <ImageIcon size={10} />
        {current + 1}/{images.length}
      </div>
      {/* Dots */}
      <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1">
        {images.map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white' : 'bg-white/35'}`} />
        ))}
      </div>
    </div>
  );
}

// ── Bouton like ───────────────────────────────────────────────────────

function CardLikeButton({ postId, initialLikes, initialLiked = false }: { postId: number; initialLikes: number; initialLiked?: boolean }) {
  const [liked,   setLiked]   = useState(initialLiked);
  const [count,   setCount]   = useState(initialLikes);
  const [pending, setPending] = useState(false);
  const [pop,     setPop]     = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!getStoredToken()) { window.location.href = '/connexion'; return; }
    if (pending) return;
    setPending(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);
    if (!wasLiked) { setPop(true); setTimeout(() => setPop(false), 400); }
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
    <button
      onClick={toggle}
      disabled={pending}
      className="flex flex-col items-center gap-1"
    >
      <div className={`transition-transform duration-200 ${pop ? 'scale-[1.4]' : 'scale-100'}`}>
        <Heart
          size={26}
          strokeWidth={1.5}
          className={`transition-all duration-200 drop-shadow-md ${liked ? 'fill-red-500 stroke-red-500' : 'stroke-white'}`}
        />
      </div>
      {count > 0 && <span className="text-white text-[11px] font-semibold drop-shadow-sm">{count}</span>}
    </button>
  );
}

// ── Bouton sauvegarder ───────────────────────────────────────────────

function CardSaveButton({ postId, initialSaved = false }: { postId: number; initialSaved?: boolean }) {
  const [saved,   setSaved]   = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [pop,     setPop]     = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!getStoredToken()) { window.location.href = '/connexion'; return; }
    if (pending) return;
    setPending(true);
    const wasSaved = saved;
    setSaved(!wasSaved);
    if (!wasSaved) { setPop(true); setTimeout(() => setPop(false), 400); }
    try {
      if (!wasSaved) await savedPostsApi.save(postId);
      else           await savedPostsApi.unsave(postId);
    } catch {
      setSaved(wasSaved);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="flex flex-col items-center gap-1"
    >
      <div className={`transition-transform duration-200 ${pop ? 'scale-[1.4]' : 'scale-100'}`}>
        <Bookmark
          size={24}
          strokeWidth={1.5}
          className={`transition-all duration-200 drop-shadow-md ${saved ? 'fill-white stroke-white' : 'stroke-white'}`}
        />
      </div>
      <span className="text-[10px] text-white/70 font-medium drop-shadow-sm">
        {saved ? 'Sauvé' : 'Sauver'}
      </span>
    </button>
  );
}

// ── Carte verticale plein écran ───────────────────────────────────────

function FeedCard({ post }: { post: ApiPost }) {
  const hd       = post.hairdresser as (ApiHairdresserProfile & { user: ApiUser }) | undefined;
  const images   = getAllImagesRaw(post).map((url) => resolveMediaUrl(url) ?? '').filter(Boolean);
  const avatarUrl = resolveMediaUrl(hd?.user?.avatar ?? null);
  const specialty = post.specialty;

  return (
    <div className="relative w-full flex-shrink-0 bg-black flex flex-col overflow-hidden" style={{ height: '100%', scrollSnapAlign: 'start' }}>

      {/* ── Zone image — occupe tout l'espace disponible ── */}
      <div className="relative flex-1 overflow-hidden">
        <InlineCarousel images={images} alt={post.description || hd?.user?.name || ''} />

        {/* Gradient de protection */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        {/* Actions verticales à droite (style TikTok) */}
        <div className="absolute right-3 bottom-4 flex flex-col items-center gap-5 z-10">
          <CardLikeButton
            postId={post.id}
            initialLikes={post.likes_count}
            initialLiked={post.liked_by_user ?? false}
          />
          <CardSaveButton
            postId={post.id}
            initialSaved={post.saved_by_user ?? false}
          />
        </div>

        {/* Info coiffeur flottante (bas gauche) */}
        {hd && (
          <Link
            href={`/coiffeur/${hd.slug}`}
            className="absolute bottom-4 left-3 flex items-center gap-2.5 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0 ring-1 ring-white/20">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={hd.user.name} fill className="object-cover" sizes="40px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-300">
                  {hd.user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight drop-shadow-md">{hd.user.name}</p>
              {hd.city && (
                <p className="text-[11px] text-white/55 flex items-center gap-0.5 mt-0.5">
                  <MapPin size={9} />
                  {hd.city}
                </p>
              )}
            </div>
          </Link>
        )}
      </div>

      {/* ── Zone infos basse ── */}
      <div className="flex-none px-4 pt-3 pb-5 bg-black">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {specialty && (
              <Link
                href={`/rechercher?specialty=${specialty.slug}`}
                className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.15em] uppercase text-white/60 mb-1.5"
              >
                <Tag size={9} />
                {specialty.name}
              </Link>
            )}
            {post.description && (
              <p className="text-[13px] text-white/80 leading-relaxed line-clamp-2">{post.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <p className="text-[10px] text-white/30">{formatDate(post.created_at)}</p>
              {post.price_indication && (
                <span className="text-[10px] font-semibold text-white/50">~{post.price_indication} €</span>
              )}
              {post.duration_minutes && (
                <span className="text-[10px] text-white/40">{post.duration_minutes} min</span>
              )}
            </div>
          </div>

          {/* CTA réserver */}
          {hd && (
            <Link
              href={`/coiffeur/${hd.slug}/reserver`}
              className="flex-shrink-0 bg-white text-neutral-900 text-[11px] font-bold px-3.5 py-2 rounded-full hover:bg-neutral-100 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Réserver
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page Feed ─────────────────────────────────────────────────────────

function FeedContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const fromId       = searchParams.get('from');

  const [feedPosts, setFeedPosts] = useState<ApiPost[]>([]);
  const [loading,   setLoading]   = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token   = getStoredToken();
    const headers: HeadersInit = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let hasPrefs = false;
    if (token) {
      try {
        const prefs = JSON.parse(localStorage.getItem('chair_preferences') ?? '{}');
        hasPrefs = (prefs.interests ?? []).length > 0;
      } catch { /* ignore */ }
    }

    // Algo hybride : si préférences → perso EN PREMIER + trending pour compléter
    // Sinon : trending seul
    const fetchTrending   = fetch(`${API}/feed?per_page=30&sort=trending`,      { headers });
    const fetchPersonal   = hasPrefs
      ? fetch(`${API}/feed?per_page=30&sort=personalized`, { headers })
      : Promise.resolve(null);

    Promise.all([fetchTrending, fetchPersonal])
      .then(async ([tRes, pRes]) => {
        const trending = await tRes.json() as PaginatedResponse<ApiPost>;
        const personal = pRes ? await pRes.json() as PaginatedResponse<ApiPost> : null;

        const personalPosts = (personal?.data ?? []).filter(
          (p) => (p.images?.length > 0 || p.cover_image) && p.hairdresser
        );
        const trendingPosts = (trending.data ?? []).filter(
          (p) => (p.images?.length > 0 || p.cover_image) && p.hairdresser
        );

        // Fusion : perso d'abord, puis trending sans doublons
        const seenIds = new Set(personalPosts.map((p) => p.id));
        const merged  = [
          ...personalPosts,
          ...trendingPosts.filter((p) => !seenIds.has(p.id)),
        ];

        setFeedPosts(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Scroll vers le post d'entrée
  useEffect(() => {
    if (!fromId || feedPosts.length === 0) return;
    const index = feedPosts.findIndex((p) => String(p.id) === fromId);
    if (index <= 0) return;
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (container) container.scrollTop = index * window.innerHeight;
    });
  }, [fromId, feedPosts]);

  function handleClose() {
    if (window.history.length > 1) router.back();
    else router.push('/');
  }

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="text-white/40 text-sm">Chargement…</div>
        </div>
        <BottomNav />
      </>
    );
  }

  if (feedPosts.length === 0) {
    return (
      <>
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-4">
          <p className="text-white/50 text-sm">Aucune publication disponible</p>
          <button onClick={handleClose} className="text-white text-sm underline">Retour</button>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      {/* Conteneur fixe qui s'arrête pile au-dessus de la BottomNav (bottom: 60px) */}
      <div className="fixed top-0 left-0 right-0 bg-black z-50" style={{ bottom: '60px' }}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <span className="text-[13px] font-bold tracking-[0.18em] uppercase text-white/70">CHAIR</span>
          {fromId && (
            <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors pointer-events-auto">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Scroll container — h-full = exactement la hauteur du parent fixe */}
        <div
          ref={containerRef}
          className="w-full h-full overflow-y-scroll no-scrollbar"
          style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {feedPosts.map((post) => (
            <FeedCard key={post.id} post={post} />
          ))}
        </div>
      </div>

      {/* BottomNav rendue directement — z-[60] pour passer au-dessus du feed */}
      <BottomNav />
    </>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white/40 text-sm">Chargement…</div>
      </div>
    }>
      <FeedContent />
    </Suspense>
  );
}
