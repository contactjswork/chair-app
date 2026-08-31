import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import PostCarousel from '@/components/ui/PostCarousel';
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider';
import LikeButton from '@/components/ui/LikeButton';
import ShareButton from '@/components/ui/ShareButton';
import BackButton from '@/components/ui/BackButton';
import { ContentMenu } from '@/components/ui/ReportSheet';
import type { ApiPost, ApiHairdresserProfile, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAllImagesRaw, getBeforeImage, getAfterImage, formatDate } from '@/lib/types';
import { ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

async function getPost(id: string): Promise<ApiPost | null> {
  const res = await fetch(`${API}/posts/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Réalisations voisines, pour « précédent / suivant ».
 *
 * per_page=60 et non la valeur par défaut de 12 : au-delà de la douzième
 * réalisation, la courante n'était pas dans le lot, l'index valait -1, le
 * compteur affichait « 0 / 12 » et la flèche suivante renvoyait à la PREMIÈRE
 * réalisation du coiffeur. On arrive ici par un lien partagé, depuis les
 * favoris ou les inspirations — le cas n'a rien d'exotique.
 */
async function getSiblingPosts(slug: string): Promise<ApiPost[]> {
  const res = await fetch(`${API}/hairdressers/${slug}/posts?per_page=60`, { cache: 'no-store' });
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
  // Index inconnu (réalisation hors du lot chargé) : on n'affiche NI compteur
  // ni flèches, plutôt qu'un « 0 / 12 » et une flèche qui ment sur sa cible.
  const hasPosition  = currentIndex >= 0;
  const prevPost     = hasPosition && currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost     = hasPosition && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  const others    = allPosts.filter((p) => p.id !== post.id).slice(0, 6);
  const images    = getAllImagesRaw(post).map((url) => resolveMediaUrl(url) ?? '').filter(Boolean);
  const avatarUrl = resolveMediaUrl(hairdresser.user.avatar);
  const videoUrl  = post.type === 'video' ? resolveMediaUrl(post.video_url) : null;
  // Transformation : le curseur avant/après remplace le carrousel — le geste
  // de révéler vaut mieux que deux vignettes figées.
  const beforeUrl = post.type === 'before_after' ? resolveMediaUrl(getBeforeImage(post)) : null;
  const afterUrl  = post.type === 'before_after' ? resolveMediaUrl(getAfterImage(post)) : null;
  const videoPoster = resolveMediaUrl(post.video_thumbnail_url) ?? undefined;
  const rating    = hairdresser.reviews_count > 0 ? parseFloat(String(hairdresser.avg_rating)) : null;

  return (
    <AppShell>
      {/* Refonte : la page empilait un bandeau, un média, un bloc coiffeur, une
          rangée d'actions et un pavé de texte, tous séparés par des filets —
          l'aspect d'un post de réseau social générique, très loin de la DA
          CHAIR. Ici le média occupe le haut sans rien au-dessus, le texte
          respire, et le coiffeur devient une vraie carte : c'est LUI qu'on
          vient chercher, la réalisation n'est qu'une porte d'entrée. */}
      <div className="max-w-lg mx-auto pb-28">

        {/* ── Média plein cadre ───────────────────────────────────────── */}
        <div className="relative">
          {videoUrl ? (
            <div className="relative w-full aspect-[4/5] bg-black">
              <video
                src={videoUrl}
                poster={videoPoster}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          ) : beforeUrl && afterUrl ? (
            <BeforeAfterSlider
              before={beforeUrl}
              after={afterUrl}
              alt={post.description || hairdresser.user.name}
              aspectClass="aspect-[4/5]"
            />
          ) : (
            <PostCarousel
              images={images}
              alt={post.description || hairdresser.user.name}
              aspectClass="aspect-[4/5]"
            />
          )}

          <BackButton fallbackHref={`/app/coiffeur/${slug}`} />

          <div className="absolute top-3 right-3 z-20">
            <ContentMenu
              type="post"
              contentId={post.id}
              authorUserId={hairdresser.user.id}
              authorName={hairdresser.user.name}
              tone="dark"
              label="Signaler ou bloquer"
            />
          </div>
        </div>

        <div className="px-5">

          {/* ── Spécialité + description ─────────────────────────────── */}
          <div className="pt-6">
            {post.specialty && (
              <Link
                href={`/app/recherche?specialty=${post.specialty.slug}`}
                className="inline-block text-[10px] font-bold tracking-[0.22em] uppercase text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                {post.specialty.name}
              </Link>
            )}

            {post.description && (
              <p className="text-[17px] text-neutral-900 leading-[1.5] mt-2 break-words [overflow-wrap:anywhere]">
                {post.description}
              </p>
            )}

            <p className="text-[11px] text-neutral-500 mt-3">{formatDate(post.created_at)}</p>
          </div>

          {/* ── Actions ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-6 mt-5 pb-6 border-b border-neutral-100">
            <LikeButton postId={post.id} initialLikes={post.likes_count} initialLiked={post.liked_by_user} />
            <ShareButton hairdresserName={hairdresser.user.name} description={post.description ?? undefined} />
          </div>

          {/* ── Le coiffeur : la vraie destination de cette page ──────── */}
          <Link
            href={`/app/coiffeur/${slug}`}
            className="mt-6 flex items-center gap-3.5 rounded-3xl border border-neutral-100 bg-white px-4 py-3.5 active:scale-[0.98] transition-transform"
          >
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={hairdresser.user.name} fill className="object-cover" sizes="48px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-base font-bold text-neutral-500">
                    {hairdresser.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-neutral-900 leading-tight truncate">
                {hairdresser.user.name}
              </p>
              <div className="flex items-center gap-2.5 mt-1">
                {hairdresser.city && (
                  <span className="inline-flex items-center gap-1 text-[12px] text-neutral-400">
                    <MapPin size={11} />
                    {hairdresser.city}
                  </span>
                )}
                {rating !== null && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-500">
                    <Star size={10} className="fill-neutral-900 stroke-none" />
                    {rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            <span className="text-[12px] font-semibold text-neutral-900 whitespace-nowrap">
              Voir le profil
            </span>
            <ChevronRight size={15} className="text-neutral-300 flex-shrink-0 -ml-1" />
          </Link>

          {/* ── Navigation entre réalisations ────────────────────────── */}
          {hasPosition && allPosts.length > 1 && (
            <div className="flex items-center justify-between mt-6">
              {prevPost ? (
                <Link
                  href={`/app/realisation/${prevPost.id}`}
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors py-2 pr-2"
                  aria-label="Réalisation précédente"
                >
                  <ChevronLeft size={15} />
                  Précédente
                </Link>
              ) : <span />}

              <span className="text-[11px] text-neutral-500 font-medium tabular-nums">
                {currentIndex + 1} / {allPosts.length}
              </span>

              {nextPost ? (
                <Link
                  href={`/app/realisation/${nextPost.id}`}
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors py-2 pl-2"
                  aria-label="Réalisation suivante"
                >
                  Suivante
                  <ChevronRight size={15} />
                </Link>
              ) : <span />}
            </div>
          )}

          {/* ── Autres réalisations ──────────────────────────────────── */}
          {others.length > 0 && (
            <div className="mt-10">
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-neutral-400 mb-3">
                Du même coiffeur
              </p>
              {/* Grille carrée plutôt qu'une bande de vignettes de 80 px :
                  à cette taille on ne distinguait pas une coupe d'une autre. */}
              <div className="grid grid-cols-3 gap-1.5">
                {others.map((p) => {
                  const thumb = resolveMediaUrl(getAllImagesRaw(p)[0]);
                  return (
                    <Link
                      key={p.id}
                      href={`/app/realisation/${p.id}`}
                      className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 active:scale-[0.97] transition-transform"
                    >
                      {thumb && (
                        <Image
                          src={thumb}
                          alt={p.description || 'Réalisation'}
                          fill
                          className="object-cover"
                          sizes="33vw"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
