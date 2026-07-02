'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { interactions, savedPosts, type SavedHairdresser } from '@/lib/api';
import type { ApiPost } from '@/lib/types';
import { Heart, MapPin, Star, BadgeCheck, LogIn, ChevronRight, Bookmark } from 'lucide-react';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';

type Tab = 'coiffeurs' | 'publications';

// ── Card coiffeur ─────────────────────────────────────────────────────────────

function HairdresserCard({ h, onUnsave }: { h: SavedHairdresser; onUnsave: (id: number) => void }) {
  const banner = resolveMediaUrl(h.banner_image);
  const avatar = resolveMediaUrl(h.user.avatar);
  const rating = parseFloat(h.avg_rating);
  const spec   = h.specialties[0]?.name;

  return (
    <div className="flex items-stretch rounded-2xl overflow-hidden border border-neutral-100 bg-white shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/app/coiffeur/${h.slug}`} className="relative w-[100px] flex-shrink-0 bg-neutral-900">
        {banner ? (
          <Image src={banner} alt={h.user.name} fill className="object-cover brightness-75" sizes="100px" />
        ) : (
          <div className="absolute inset-0 bg-neutral-800" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/60 shadow-lg">
            {avatar ? (
              <Image src={avatar} alt={h.user.name} fill className="object-cover" sizes="44px" />
            ) : (
              <div className="w-full h-full bg-neutral-700 flex items-center justify-center text-white font-bold">
                {h.user.name.charAt(0)}
              </div>
            )}
          </div>
        </div>
        {h.is_verified && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow">
            <BadgeCheck size={11} className="text-neutral-900" />
          </div>
        )}
      </Link>

      <Link href={`/app/coiffeur/${h.slug}`} className="flex-1 min-w-0 px-3.5 py-3 flex flex-col justify-center gap-1">
        <p className="text-[14px] font-bold text-neutral-900 truncate">{h.user.name}</p>
        {spec && <p className="text-[11px] text-neutral-400 truncate">{spec}</p>}
        <div className="flex items-center gap-2.5 mt-0.5">
          {rating > 0 && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-neutral-700">
              <Star size={11} className="fill-amber-400 stroke-none" />
              {rating.toFixed(1)}
              <span className="text-neutral-400 font-normal text-[11px]">({h.reviews_count})</span>
            </span>
          )}
          {h.city && (
            <span className="flex items-center gap-1 text-[11px] text-neutral-400 truncate">
              <MapPin size={10} />{h.city}
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-col items-center justify-between py-3 pr-3 gap-2">
        <button
          onClick={() => onUnsave(h.id)}
          className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-red-50 flex items-center justify-center transition-colors group"
          aria-label="Retirer des favoris"
        >
          <Heart size={13} className="fill-neutral-300 stroke-none group-hover:fill-red-400 transition-colors" />
        </button>
        <Link href={`/app/coiffeur/${h.slug}`} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors">
          <ChevronRight size={14} strokeWidth={2.5} className="text-neutral-900" />
        </Link>
      </div>
    </div>
  );
}

// ── Card publication ──────────────────────────────────────────────────────────

function PostCard({ post, onUnsave }: { post: ApiPost; onUnsave: (id: number) => void }) {
  const url     = resolveMediaUrl(getAfterImage(post));
  const hd      = post.hairdresser as (SavedHairdresser & { user: { name: string } }) | undefined;
  const avatar  = resolveMediaUrl(hd?.user?.avatar ?? null);
  const spec    = post.specialty?.name;

  if (!url) return null;
  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 group">
      <Image src={url} alt={post.description ?? ''} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="50vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Retirer favori */}
      <button
        onClick={() => onUnsave(post.id)}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group/btn"
        aria-label="Retirer"
      >
        <Bookmark size={12} className="fill-white stroke-none group-hover/btn:fill-neutral-300 transition-colors" />
      </button>

      {/* Infos bas */}
      <Link href={`/app/realisation/${post.id}`} className="absolute bottom-0 left-0 right-0 p-2.5">
        <div className="flex items-center gap-2">
          {avatar && (
            <div className="relative w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/60 flex-shrink-0">
              <Image src={avatar} alt={hd?.user?.name ?? ''} fill className="object-cover" sizes="24px" />
            </div>
          )}
          <div className="min-w-0">
            {spec && <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider truncate">{spec}</p>}
            <p className="text-[11px] font-bold text-white truncate leading-tight">{hd?.user?.name ?? ''}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function HDSkeleton() {
  return (
    <div className="flex rounded-2xl overflow-hidden border border-neutral-100 bg-white h-[84px]">
      <div className="w-[100px] bg-neutral-100 animate-pulse" />
      <div className="flex-1 px-3.5 py-3 space-y-2">
        <div className="h-4 w-28 bg-neutral-100 rounded-full animate-pulse" />
        <div className="h-3 w-20 bg-neutral-100 rounded-full animate-pulse" />
        <div className="h-3 w-24 bg-neutral-100 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

function PostSkeleton() {
  return <div className="aspect-square rounded-2xl bg-neutral-100 animate-pulse" />;
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-4">
        {tab === 'coiffeurs'
          ? <Heart size={22} className="text-neutral-300" />
          : <Bookmark size={22} className="text-neutral-300" />}
      </div>
      <h3 className="text-[15px] font-bold text-neutral-900 mb-1.5">
        {tab === 'coiffeurs' ? 'Aucun coiffeur sauvegardé' : 'Aucune publication sauvegardée'}
      </h3>
      <p className="text-[12px] text-neutral-400 mb-6 max-w-[220px] leading-relaxed">
        {tab === 'coiffeurs'
          ? 'Sauvegardez des coiffeurs depuis leur profil pour les retrouver ici.'
          : 'Sauvegardez des réalisations depuis le feed pour les retrouver ici.'}
      </p>
      <Link
        href={tab === 'coiffeurs' ? '/app/recherche' : '/app/feed'}
        className="bg-neutral-900 text-white text-[13px] font-semibold px-5 py-3 rounded-full hover:bg-neutral-700 transition-colors"
      >
        {tab === 'coiffeurs' ? 'Découvrir des coiffeurs' : 'Explorer le feed'}
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FavorisPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [tab,        setTab]        = useState<Tab>('coiffeurs');
  const [coiffeurs,  setCoiffeurs]  = useState<SavedHairdresser[]>([]);
  const [posts,      setPosts]      = useState<ApiPost[]>([]);
  const [loadingHD,  setLoadingHD]  = useState(false);
  const [loadingP,   setLoadingP]   = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingHD(true);
    setLoadingP(true);
    interactions.savedList()
      .then(setCoiffeurs).catch(() => {}).finally(() => setLoadingHD(false));
    savedPosts.list()
      .then(setPosts).catch(() => {}).finally(() => setLoadingP(false));
  }, [user]);

  function handleUnsaveHD(id: number) {
    interactions.unsave(id).catch(() => {});
    setCoiffeurs((prev) => prev.filter((h) => h.id !== id));
  }

  function handleUnsavePost(id: number) {
    savedPosts.unsave(id).catch(() => {});
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  if (authLoading) {
    return (
      <AppShell>
        <div className="px-4 pt-20 pb-8 max-w-lg mx-auto space-y-3">
          {[1, 2, 3].map((i) => <HDSkeleton key={i} />)}
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="min-h-[75vh] flex flex-col items-center justify-center px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-4">
            <Heart size={22} className="text-neutral-300" />
          </div>
          <h2 className="text-[18px] font-bold text-neutral-900 mb-2">Vos favoris vous attendent</h2>
          <p className="text-[13px] text-neutral-400 mb-6 max-w-xs leading-relaxed">
            Connectez-vous pour sauvegarder vos coiffeurs et réalisations préférés.
          </p>
          <Link href="/connexion" className="flex items-center gap-2 bg-neutral-900 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-neutral-700 transition-colors">
            <LogIn size={15} /> Se connecter
          </Link>
          <Link href="/inscription" className="mt-3 text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">
            Créer un compte
          </Link>
        </div>
      </AppShell>
    );
  }

  const totalCount = coiffeurs.length + posts.length;

  return (
    <AppShell>
      <div className="px-4 md:px-6 max-w-lg mx-auto pb-12">

        {/* Header */}
        <div className="pt-6 pb-4">
          <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">Favoris</h1>
          {totalCount > 0 && (
            <p className="text-[12px] text-neutral-400 mt-0.5">
              {coiffeurs.length} coiffeur{coiffeurs.length > 1 ? 's' : ''} · {posts.length} publication{posts.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-5">
          {(['coiffeurs', 'publications'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 ${
                tab === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {t === 'coiffeurs' ? `Coiffeurs${coiffeurs.length > 0 ? ` (${coiffeurs.length})` : ''}` : `Publications${posts.length > 0 ? ` (${posts.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Tab coiffeurs */}
        {tab === 'coiffeurs' && (
          loadingHD ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <HDSkeleton key={i} />)}</div>
          ) : coiffeurs.length > 0 ? (
            <div className="space-y-3">
              {coiffeurs.map((h) => (
                <HairdresserCard key={h.id} h={h} onUnsave={handleUnsaveHD} />
              ))}
            </div>
          ) : (
            <EmptyState tab="coiffeurs" />
          )
        )}

        {/* Tab publications */}
        {tab === 'publications' && (
          loadingP ? (
            <div className="grid grid-cols-2 gap-2">{[1, 2, 3, 4].map((i) => <PostSkeleton key={i} />)}</div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onUnsave={handleUnsavePost} />
              ))}
            </div>
          ) : (
            <EmptyState tab="publications" />
          )
        )}

      </div>
    </AppShell>
  );
}
