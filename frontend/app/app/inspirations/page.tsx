'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl, type ApiPost } from '@/lib/types';
import { savedPosts as savedPostsApi } from '@/lib/api';
import { Heart, ChevronLeft, X } from 'lucide-react';

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
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Mes inspirations</h1>
            {!loading && (
              <p className="text-xs text-neutral-400 mt-0.5">
                {posts.length === 0 ? 'Aucune réalisation sauvegardée' : `${posts.length} réalisation${posts.length > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-[2px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-neutral-100 animate-pulse rounded-sm" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-5">
              <Heart size={26} className="text-neutral-300" />
            </div>
            <h2 className="font-bold text-neutral-900 mb-2">Aucune inspiration</h2>
            <p className="text-sm text-neutral-400 max-w-[260px] mb-6">
              Sauvegardez des réalisations qui vous inspirent en appuyant sur le coeur dans le feed.
            </p>
            <Link
              href="/"
              className="flex items-center gap-2 bg-neutral-900 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-neutral-700 transition-colors"
            >
              Explorer le feed
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px]">
            {posts.map((post) => {
              const url = resolveMediaUrl(
                post.images.find((i) => i.type === 'after' || i.type === 'result')?.url ?? post.cover_image
              );
              const hairdresserName = post.hairdresser?.user?.name;
              const specialty = post.specialty?.name;

              return (
                <div key={post.id} className="relative group aspect-square rounded-sm overflow-hidden bg-neutral-100">
                  <Link href={`/realisation/${post.id}`} className="block w-full h-full">
                    {url ? (
                      <Image
                        src={url}
                        alt={specialty ?? ''}
                        fill
                        className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        sizes="33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-neutral-200" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {specialty && (
                        <p className="text-[9px] font-semibold tracking-wide uppercase text-white/70 leading-none mb-0.5">{specialty}</p>
                      )}
                      {hairdresserName && (
                        <p className="text-[11px] font-semibold text-white leading-tight truncate">{hairdresserName}</p>
                      )}
                    </div>
                  </Link>

                  {/* Bouton retirer */}
                  <button
                    onClick={() => handleRemove(post.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70 z-10"
                    aria-label="Retirer des inspirations"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
