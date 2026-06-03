'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import FeedPostCard from './FeedPostCard';
import type { ApiPost, PaginatedResponse } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

interface Prefs {
  gender: 'femme' | 'homme' | null;
  interests: string[];
}

/** Vérifie si un post correspond à au moins un intérêt (spécialité principale OU tags) */
function postMatchesInterests(post: ApiPost, interests: string[]): boolean {
  if (interests.length === 0) return false;
  const primarySlug = post.specialty?.slug;
  const tagSlugs    = (post.tags ?? []).map((t) => t.slug);
  return interests.some(
    (i) => primarySlug === i || tagSlugs.includes(i)
  );
}

export default function PersonalizedFeedSection() {
  const [posts,        setPosts]        = useState<ApiPost[]>([]);
  const [primaryLabel, setPrimaryLabel] = useState('');
  const [primarySlug,  setPrimarySlug]  = useState('');
  const [ready,        setReady]        = useState(false);
  const [isAuth,       setIsAuth]       = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('chair_token');
    const raw   = localStorage.getItem('chair_preferences');
    if (!token || !raw) { setReady(true); return; }

    let prefs: Prefs;
    try { prefs = JSON.parse(raw); } catch { setReady(true); return; }

    const interests = prefs.interests ?? [];
    if (interests.length === 0) { setReady(true); return; }

    setIsAuth(true);

    fetch(`${API}/feed?sort=personalized&per_page=20`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then((r) => r.json())
      .then((data: PaginatedResponse<ApiPost>) => {
        const raw = (data.data ?? []).filter(
          (p) => (p.images?.length > 0 || p.cover_image) && p.hairdresser
        );

        // ── Filtre client-side : sécurité en cas de désync localStorage/BDD ──
        const matched = raw.filter((p) => postMatchesInterests(p, interests));

        setPosts(matched);

        // Label + slug : chercher dans les tags du premier post qui matche
        const allTags    = matched.flatMap((p) => p.tags ?? []);
        const matchedTag = allTags.find((t) => interests.includes(t.slug));
        // Fallback : chercher dans les spécialités du coiffeur
        const fallback = matched.flatMap((p) => p.hairdresser?.specialties ?? [])
                                .find((s) => interests.includes(s.slug));
        // Slug affiché = celui du label réel (pas forcément interests[0])
        const actualSlug = matchedTag?.slug ?? fallback?.slug ?? interests[0];
        setPrimarySlug(actualSlug);
        setPrimaryLabel(matchedTag?.name ?? fallback?.name ?? actualSlug);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready || !isAuth || posts.length === 0) return null;

  return (
    <section className="mt-10 md:mt-14">
      {/* Header */}
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-400 mb-0.5">
            Pour vous
          </p>
          <h2 className="text-[17px] md:text-[19px] font-bold text-neutral-900 tracking-tight leading-tight">
            {primaryLabel ? `Inspirations ${primaryLabel}` : 'Vos inspirations'}
          </h2>
          <p className="text-[12px] text-neutral-400 mt-0.5">
            Sélectionnées d&apos;après vos goûts
          </p>
        </div>
        <Link
          href={primarySlug ? `/rechercher?specialty=${primarySlug}` : '/rechercher'}
          className="flex-shrink-0 flex items-center gap-1 text-[12px] font-semibold text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          Voir tout <ArrowRight size={12} />
        </Link>
      </div>

      {/* Grille */}
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              aspect="portrait"
              showSave={true}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
