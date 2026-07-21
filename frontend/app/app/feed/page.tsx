'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart, Bookmark, Tag, MapPin, ImageIcon, X, Share2,
} from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import SignupPromptModal from '@/components/ui/SignupPromptModal';
import type { ApiPost, ApiHairdresserProfile, ApiUser, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAllImagesRaw } from '@/lib/types';
import { posts as postsApi, savedPosts as savedPostsApi } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

type FeedTab = 'foryou' | 'following';

// ── Carrousel horizontal interne ──────────────────────────────────────

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
      <div className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
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

// ── Bouton like ───────────────────────────────────────────────────────

function CardLikeButton({
  postId, initialLikes, initialLiked = false, onNeedAuth,
}: {
  postId: number; initialLikes: number; initialLiked?: boolean; onNeedAuth: () => void;
}) {
  const [liked,   setLiked]   = useState(initialLiked);
  const [count,   setCount]   = useState(initialLikes);
  const [pending, setPending] = useState(false);
  const [pop,     setPop]     = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!getStoredToken()) { onNeedAuth(); return; }
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
    <button onClick={toggle} disabled={pending} className="flex flex-col items-center gap-1">
      <div className={`transition-transform duration-200 ${pop ? 'scale-[1.4]' : 'scale-100'}`}>
        <Heart
          size={32} strokeWidth={1.5}
          className={`transition-all duration-200 drop-shadow-md ${liked ? 'fill-red-500 stroke-red-500' : 'stroke-white'}`}
        />
      </div>
      {count > 0 && <span className="text-white text-[11px] font-semibold drop-shadow-sm">{count}</span>}
    </button>
  );
}

// ── Bouton sauvegarder ────────────────────────────────────────────────

function CardSaveButton({
  postId, initialSaved = false, onNeedAuth,
}: {
  postId: number; initialSaved?: boolean; onNeedAuth: () => void;
}) {
  const [saved,   setSaved]   = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [pop,     setPop]     = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!getStoredToken()) { onNeedAuth(); return; }
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
    <button onClick={toggle} disabled={pending} className="flex flex-col items-center gap-1">
      <div className={`transition-transform duration-200 ${pop ? 'scale-[1.4]' : 'scale-100'}`}>
        <Bookmark
          size={30} strokeWidth={1.5}
          className={`transition-all duration-200 drop-shadow-md ${saved ? 'fill-white stroke-white' : 'stroke-white'}`}
        />
      </div>
    </button>
  );
}

// ── Bouton partager ───────────────────────────────────────────────────

function CardShareButton({
  postId, hairdresserName, description,
}: {
  postId: number; hairdresserName: string; description?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/realisation/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${hairdresserName} sur CHAIR`,
          text:  description ?? 'Découvrez cette réalisation sur CHAIR',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch { /* user cancelled */ }
  }

  return (
    <button onClick={share} className="flex flex-col items-center gap-1">
      <Share2
        size={26} strokeWidth={1.5}
        className={`drop-shadow-md transition-colors ${copied ? 'stroke-green-400' : 'stroke-white'}`}
      />
    </button>
  );
}

// ── Carte verticale plein écran ───────────────────────────────────────

function FeedCard({ post, onNeedAuth }: { post: ApiPost; onNeedAuth: () => void }) {
  const hd       = post.hairdresser as (ApiHairdresserProfile & { user: ApiUser }) | undefined;
  const images   = getAllImagesRaw(post).map((url) => resolveMediaUrl(url) ?? '').filter(Boolean);
  const avatarUrl = resolveMediaUrl(hd?.user?.avatar ?? null);
  const specialty = post.specialty;

  return (
    <div
      className="relative w-full flex-shrink-0 bg-black flex flex-col overflow-hidden"
      style={{ height: '100%', scrollSnapAlign: 'start' }}
    >
      {/* ── Zone image ── */}
      <div className="relative flex-1 overflow-hidden">
        <InlineCarousel images={images} alt={post.description || hd?.user?.name || ''} />

        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

        {/* Actions verticales droite */}
        <div className="absolute right-3 bottom-4 flex flex-col items-center gap-5 z-10">
          <CardLikeButton
            postId={post.id}
            initialLikes={post.likes_count}
            initialLiked={post.liked_by_user ?? false}
            onNeedAuth={onNeedAuth}
          />
          <CardSaveButton
            postId={post.id}
            initialSaved={post.saved_by_user ?? false}
            onNeedAuth={onNeedAuth}
          />
          <CardShareButton
            postId={post.id}
            hairdresserName={hd?.user?.name ?? 'CHAIR'}
            description={post.description}
          />
        </div>

        {/* Info coiffeur bas gauche */}
        {hd && (
          <div className="absolute bottom-4 left-3 right-16 flex items-center gap-2.5 z-10">
            <Link
              href={`/app/coiffeur/${hd.slug}`}
              className="flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-700 ring-1 ring-white/20">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={hd.user.name} fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-300">
                    {hd.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/app/coiffeur/${hd.slug}`}
                className="text-[13px] font-bold text-white leading-tight drop-shadow-md truncate block"
                onClick={(e) => e.stopPropagation()}
              >
                {hd.user.name}
              </Link>
              {hd.city && (
                <p className="text-[11px] text-white/50 flex items-center gap-0.5 mt-0.5">
                  <MapPin size={9} />
                  {hd.city}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Zone infos basse ── */}
      {(specialty || post.description) && (
        <div className="flex-none px-4 pt-3 pb-5 bg-black">
          {specialty && (
            <Link
              href={`/app/recherche?specialty=${specialty.slug}`}
              className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.15em] uppercase text-white/50 mb-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Tag size={9} />
              {specialty.name}
            </Link>
          )}
          {post.description && (
            <p className="text-[13px] text-white/80 leading-relaxed line-clamp-2">{post.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page Feed ─────────────────────────────────────────────────────────

function FeedContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const fromId       = searchParams.get('from');

  const [activeTab,    setActiveTab]    = useState<FeedTab>('foryou');
  const [feedPosts,    setFeedPosts]    = useState<ApiPost[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [hasMore,      setHasMore]      = useState(true);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [showModal,    setShowModal]    = useState(false);
  const containerRef   = useRef<HTMLDivElement>(null);
  const hasPrefsRef    = useRef(false);

  // ── Chargement initial / changement de tab ────────────────────────
  const loadFeed = useCallback(async (tab: FeedTab) => {
    setLoading(true);
    setFeedPosts([]);
    setCurrentPage(1);
    setHasMore(true);

    const token   = getStoredToken();
    const headers: HeadersInit = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      let prefs = false;
      if (token) {
        try {
          const stored = JSON.parse(localStorage.getItem('chair_preferences') ?? '{}');
          prefs = (stored.interests ?? []).length > 0;
        } catch { /* ignore */ }
      }
      hasPrefsRef.current = prefs;

      if (tab === 'following') {
        const res  = await fetch(`${API}/feed?per_page=20&sort=following`, { headers });
        const data = await res.json() as PaginatedResponse<ApiPost>;
        const posts = (data.data ?? []).filter((p) => (p.images?.length > 0 || p.cover_image) && p.hairdresser);
        setFeedPosts(posts);
        setHasMore(data.current_page < data.last_page);
      } else {
        // Pour toi : personnalisé si préférences, sinon trending
        const sort = prefs ? 'personalized' : 'trending';
        const res  = await fetch(`${API}/feed?per_page=20&sort=${sort}`, { headers });
        const data = await res.json() as PaginatedResponse<ApiPost>;
        const personal = (data.data ?? []).filter((p) => (p.images?.length > 0 || p.cover_image) && p.hairdresser);

        // Compléter avec trending si peu de posts personnalisés
        if (prefs && personal.length < 10) {
          const res2  = await fetch(`${API}/feed?per_page=20&sort=trending`, { headers });
          const data2 = await res2.json() as PaginatedResponse<ApiPost>;
          const trending = (data2.data ?? []).filter((p) => (p.images?.length > 0 || p.cover_image) && p.hairdresser);
          const seen  = new Set(personal.map((p) => p.id));
          setFeedPosts([...personal, ...trending.filter((p) => !seen.has(p.id))]);
        } else {
          setFeedPosts(personal);
          setHasMore(data.current_page < data.last_page);
        }
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(activeTab); }, [activeTab, loadFeed]);

  // ── Scroll au post d'entrée ───────────────────────────────────────
  useEffect(() => {
    if (!fromId || feedPosts.length === 0) return;
    const index = feedPosts.findIndex((p) => String(p.id) === fromId);
    if (index <= 0) return;
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (container) container.scrollTop = index * container.clientHeight;
    });
  }, [fromId, feedPosts]);

  // ── Pagination infinie ────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const next = currentPage + 1;
    const token   = getStoredToken();
    const headers: HeadersInit = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const sort = activeTab === 'following'
      ? 'following'
      : (hasPrefsRef.current ? 'personalized' : 'trending');

    try {
      const res  = await fetch(`${API}/feed?per_page=20&sort=${sort}&page=${next}`, { headers });
      const data = await res.json() as PaginatedResponse<ApiPost>;
      const newPosts = (data.data ?? []).filter((p) => (p.images?.length > 0 || p.cover_image) && p.hairdresser);
      const existing = new Set(feedPosts.map((p) => p.id));
      const unique   = newPosts.filter((p) => !existing.has(p.id));

      if (unique.length === 0 || data.current_page >= data.last_page) {
        setHasMore(false);
      } else {
        setFeedPosts((prev) => [...prev, ...unique]);
        setCurrentPage(next);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loading, currentPage, feedPosts, activeTab]);

  // ── Détection fin de scroll ───────────────────────────────────────
  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const nearEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight * 2;
    if (nearEnd) loadMore();
  }

  function handleClose() {
    if (window.history.length > 1) router.back();
    else router.push('/');
  }

  // ── Tabs ──────────────────────────────────────────────────────────
  const tabs: { id: FeedTab; label: string }[] = [
    { id: 'foryou',    label: 'Pour toi' },
    { id: 'following', label: 'Abonnements' },
  ];

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
        <BottomNav />
      </>
    );
  }

  if (feedPosts.length === 0) {
    return (
      <>
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-4 px-8 text-center">
          {activeTab === 'following' ? (
            <>
              <p className="text-white/70 text-[15px] font-semibold">Aucun abonnement</p>
              <p className="text-white/40 text-[13px] leading-relaxed">Suis des coiffeurs pour voir leurs réalisations ici.</p>
              <Link href="/app/recherche" className="mt-2 text-[13px] font-semibold text-white bg-white/10 border border-white/20 px-5 py-2.5 rounded-full">
                Découvrir des coiffeurs
              </Link>
            </>
          ) : (
            <>
              <p className="text-white/50 text-sm">Aucune publication disponible</p>
              <button onClick={handleClose} className="text-white text-sm underline">Retour</button>
            </>
          )}
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-black z-50" style={{ bottom: '60px' }}>

        {/* ── Header avec tabs ── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none">
          {/* Fermer */}
          <div className="relative flex items-center justify-center px-4 pt-4 pb-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            {fromId && (
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 text-white/60 hover:text-white transition-colors pointer-events-auto"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Tabs Pour toi / Tendances */}
          <div className="flex items-center justify-center gap-6 pb-2 pointer-events-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id !== activeTab) {
                    setActiveTab(tab.id);
                    containerRef.current?.scrollTo({ top: 0 });
                  }
                }}
                className={`text-[13px] font-bold transition-all pb-1 ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-white'
                    : 'text-white/45 border-b-2 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scroll container ── */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-scroll no-scrollbar"
          style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {feedPosts.map((post) => (
            <FeedCard key={post.id} post={post} onNeedAuth={() => setShowModal(true)} />
          ))}

          {/* Indicateur chargement suite */}
          {loadingMore && (
            <div
              className="flex items-center justify-center bg-black"
              style={{ height: '100%', scrollSnapAlign: 'start' }}
            >
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          )}

          {/* Message fin de feed */}
          {!hasMore && feedPosts.length > 0 && (
            <div
              className="flex flex-col items-center justify-center gap-3 bg-black"
              style={{ height: '100%', scrollSnapAlign: 'start' }}
            >
              <p className="text-white/30 text-sm">Tu as tout vu</p>
              <button
                onClick={() => loadFeed(activeTab)}
                className="text-xs font-semibold text-white/50 border border-white/20 px-4 py-2 rounded-full hover:border-white/40 transition-colors"
              >
                Recharger
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav />

      <SignupPromptModal
        open={showModal}
        onClose={() => setShowModal(false)}
        message="Crée un compte gratuit pour sauvegarder tes inspirations et suivre tes coiffeurs préférés."
      />
    </>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    }>
      <FeedContent />
    </Suspense>
  );
}
