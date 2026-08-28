'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGeo } from '@/lib/homeFilters';
import { SectionHeader } from './HomeGeoStrips';
import Reveal from './Reveal';
import type { ApiHairdresserProfile, ApiPost, ApiUser, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const RADIUS_KM = 30;

function RealisationGrid({ posts, limit = 9 }: { posts: ApiPost[]; limit?: number }) {
  const visible = posts.slice(0, limit && limit > 0 ? limit : 9);
  if (visible.length === 0) return null;
  return (
    // gap-1 (au lieu de 3px) : respire un peu plus sans perdre la densité
    // "mur de photos" voulue ; rounded-2xl aligne ces tuiles sur le même
    // rayon de coin que les autres cartes de la home (recommandation, HD,
    // carte) plutôt que le rounded-xl isolé qui détonnait ici.
    <div className="grid grid-cols-3 gap-1.5 px-4 md:px-8 max-w-6xl md:mx-auto">
      {visible.map((post, i) => {
        const url = resolveMediaUrl(getAfterImage(post));
        const hd = post.hairdresser as (ApiHairdresserProfile & { user: ApiUser }) | undefined;
        return (
          <Reveal key={post.id} delay={(i % 6) * 50}>
            <Link
              href={`/app/realisation/${post.id}`}
              className="relative block aspect-square overflow-hidden rounded-[20px] bg-neutral-100 shadow-[0_2px_10px_-4px_rgba(10,10,10,0.1)] group active:scale-[0.97] transition-transform duration-200"
            >
              {url ? (
                <Image
                  src={url}
                  alt={post.description ?? ''}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="33vw"
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-200" />
              )}
              {/* Dégradé + nom TOUJOURS visibles à faible intensité (pas
                  seulement au group-hover) — sur mobile il n'existe pas de
                  vrai hover, donc la légende n'apparaissait jamais : la
                  grille se lisait comme "des photos brutes sans info",
                  exactement le reproche fait sur les captures iPhone. Le
                  hover ne fait plus qu'accentuer ce qui est déjà lisible. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent group-hover:from-black/80 transition-colors duration-300" />
              {hd?.user?.name && (
                <p className="absolute bottom-2 left-2 right-2 text-white text-[11px] font-semibold truncate drop-shadow-sm">
                  {hd.user.name}
                </p>
              )}
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}

/**
 * "Communauté réalisations" — pour un utilisateur connecté avec une ville et
 * des spécialités choisies, ne montre QUE des publications ciblées pour lui
 * (sort=personalized : mêmes spécialités + même genre + rayon réel autour de
 * sa ville). Reste sur le flux "tendance" générique pour les visiteurs, qui
 * n'ont ni préférences ni compte à filtrer.
 */
export default function HomeRealisationsSection({
  fallback, titleOverride, limit = 9,
}: { fallback: ApiPost[]; titleOverride?: string | null; limit?: number }) {
  const { user, isLoading } = useAuth();
  const [posts, setPosts] = useState<ApiPost[]>(fallback);
  const [personalized, setPersonalized] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;
    const geo = getUserGeo(user);
    const token = typeof window !== 'undefined' ? localStorage.getItem('chair_token') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    async function fetchPersonalized(withGeo: boolean): Promise<ApiPost[]> {
      const params = new URLSearchParams({ sort: 'personalized', per_page: '24' });
      if (withGeo && geo) {
        params.set('lat', String(geo.lat));
        params.set('lng', String(geo.lng));
        params.set('radius', String(RADIUS_KM));
      }
      try {
        const res = await fetch(`${API}/feed?${params}`, { headers });
        const data: PaginatedResponse<ApiPost> = await res.json();
        return data.data ?? [];
      } catch { return []; }
    }

    (async () => {
      // Près de chez vous d'abord, puis national (toujours spécialité + genre
      // filtrés) — jamais une section vide juste parce que la ville manque ou
      // que personne dans le coin n'a encore publié dans ce style.
      let results = geo ? await fetchPersonalized(true) : [];
      if (!results.length) results = await fetchPersonalized(false);
      if (results.length) { setPosts(results); setPersonalized(true); }
    })();
  }, [user, isLoading]);

  const displayPosts = posts.filter((p) => getAfterImage(p) && p.hairdresser);
  if (displayPosts.length === 0) return null;

  return (
    <section className="pt-10">
      <Reveal>
        <SectionHeader
          tag="Communauté"
          title={titleOverride ?? (personalized ? 'Réalisations pour toi' : 'Réalisations du moment')}
          href="/app/feed"
        />
      </Reveal>
      <RealisationGrid posts={displayPosts} limit={limit} />
    </section>
  );
}
