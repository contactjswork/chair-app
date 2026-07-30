'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl, type ApiPost } from '@/lib/types';
import { savedPosts as savedPostsApi } from '@/lib/api';
import { Heart, X, Compass } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/Button';

function InspirationTile({ post, onRemove }: { post: ApiPost; onRemove: (id: number) => void }) {
  const url = resolveMediaUrl(
    post.images.find((i) => i.type === 'after' || i.type === 'result')?.url ?? post.cover_image
  );
  const hairdresserName = post.hairdresser?.user?.name;
  const specialty = post.specialty?.name;

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100">
      <Link href={`/realisation/${post.id}`} className="block w-full h-full">
        {url ? (
          <Image
            src={url}
            alt={specialty ?? hairdresserName ?? 'Réalisation'}
            fill
            className="object-cover"
            sizes="33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-200" />
        )}
        {/* Bandeau d'info — toujours visible, pas de hover (aucun effet au tactile) */}
        {(specialty || hairdresserName) && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-2">
              {specialty && (
                <p className="text-[8.5px] font-semibold tracking-[0.15em] uppercase text-white/70 leading-none mb-0.5 truncate">{specialty}</p>
              )}
              {hairdresserName && (
                <p className="text-[11px] font-semibold text-white leading-tight truncate">{hairdresserName}</p>
              )}
            </div>
          </>
        )}
      </Link>

      {/* Retirer — toujours visible (pas de group-hover, invisible au tactile) */}
      <button
        onClick={(e) => { e.preventDefault(); onRemove(post.id); }}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/45 flex items-center justify-center active:scale-90 transition-transform z-10"
        aria-label="Retirer des inspirations"
      >
        <X size={12} className="text-white" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default function InspirationPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [posts,   setPosts]   = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) { router.replace('/connexion'); return; }
    if (!user) return;
    savedPostsApi.list()
      .then((data) => setPosts(data as ApiPost[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, isLoading, router]);

  async function handleRemove(postId: number) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await savedPostsApi.unsave(postId);
    } catch {
      // best effort
    }
  }

  if (isLoading || !user) return null;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 pb-24">

        <PageHeader title="Mes inspirations" backHref="/app/compte" />

        {!loading && (
          <p className="text-[12px] text-neutral-400 -mt-2 mb-4">
            {posts.length === 0 ? 'Aucune réalisation sauvegardée' : `${posts.length} réalisation${posts.length > 1 ? 's' : ''}`}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-3 gap-1.5 mt-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Aucune inspiration"
            subtitle="Sauvegarde les réalisations qui t'inspirent en appuyant sur le coeur dans le feed."
            action={
              <PrimaryButton href="/app/feed" icon={<Compass size={15} />}>
                Explorer le feed
              </PrimaryButton>
            }
          />
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {posts.map((post) => (
              <InspirationTile key={post.id} post={post} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
