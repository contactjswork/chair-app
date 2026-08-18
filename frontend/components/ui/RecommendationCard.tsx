'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, BadgeCheck } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/types';
import { formatDistance } from '@/hooks/useGeolocation';
import { LEVEL_RING, ringGradientClass } from '@/lib/chairLevel';
import type { RecommendationResult } from '@/lib/recommendation';
import { PremiumBadge } from '@/components/ui/PremiumLock';

/**
 * Carte "hero" pour /api/recommendations — même langage visuel que HDCard
 * (components/ui/HomeGeoStrips.tsx) mais adaptée au contrat plat de
 * RecommendationResult (pas de `user` imbriqué, chair_level déjà résolu par
 * le backend, jamais estimé côté client faute de posts_count/followers_count
 * dans ce contrat volontairement allégé).
 *
 * Refonte visuelle (retour de Julien : la version précédente — photo floutée
 * + texte blanc en surimpression — se lisait "plate"/"pas envie") : vraie
 * photo NETTE en pleine carte façon fiche listing (Airbnb), panneau
 * d'information blanc en dessous (jamais du texte sur fond flouté peu
 * lisible), avatar en médaillon à cheval sur la jonction photo/panneau.
 */
export default function RecommendationCard({ r, size = 'lg' }: { r: RecommendationResult; size?: 'lg' | 'md' }) {
  const banner = resolveMediaUrl(r.image);
  const avatar = resolveMediaUrl(r.avatar);
  // Photo de profil en priorité (retour Julien : la bannière salon prenait
  // toute la carte à la place du visage du coiffeur) — la bannière ne sert
  // plus qu'en repli si aucune photo de profil n'existe.
  const photo = avatar ?? banner;
  const hasRating = r.reviews_count > 0;
  const spec = r.specialties[0]?.name;
  const levelColor = r.chair_level?.color ?? 'neutral';
  const ring = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;
  // Réduite (retour Julien : la nouvelle carte était "un peu" trop grande).
  const width = size === 'lg' ? 'w-[152px] md:w-[176px]' : 'w-[134px] md:w-[152px]';

  return (
    <Link
      href={`/app/coiffeur/${r.slug}`}
      className={`relative flex-shrink-0 ${width} block group active:scale-[0.97] transition-transform duration-200`}
    >
      <div className="rounded-[24px] overflow-hidden bg-white shadow-[0_10px_28px_-10px_rgba(10,10,10,0.22)] group-hover:shadow-[0_18px_38px_-12px_rgba(10,10,10,0.3)] transition-shadow duration-300">
        {/* Photo NETTE, jamais floutée — c'est le vrai portfolio du coiffeur */}
        <div className="relative aspect-[4/5] bg-neutral-200 overflow-hidden">
          {photo ? (
            <Image
              src={photo}
              alt={r.name}
              fill
              className="object-cover group-hover:scale-[1.05] transition-transform duration-500"
              sizes="212px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-300 to-neutral-400 flex items-center justify-center">
              <span className="text-4xl font-bold text-white/70">{r.name.charAt(0)}</span>
            </div>
          )}
          {/* Voile discret en haut, juste pour la lisibilité des badges — pas
              un habillage plein cadre comme avant. */}
          <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

          {r.is_chair_pick && (
            <span className="absolute top-2.5 left-2.5 z-10 text-[8px] font-bold tracking-[0.12em] uppercase text-neutral-900 px-2 py-1 rounded-full bg-white shadow-sm">
              Coup de cœur
            </span>
          )}
          {(r.is_verified || r.is_chair_plus) && (
            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
              {r.is_verified && (
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <BadgeCheck size={11} className="text-neutral-900" />
                </div>
              )}
              {r.is_chair_plus && <PremiumBadge />}
            </div>
          )}
        </div>

        {/* Liseré fin — seul vestige du niveau CHAIR ici (plus de médaillon,
            voir plus bas) ; `ringGradientClass` renvoie une classe bg-*,
            jamais utilisable comme couleur de bordure directement. */}
        {ring.show && <div className={`h-[3px] w-full ${ringGradientClass(levelColor)}`} />}

        {/* Panneau d'info — fond blanc franc, jamais de texte sur photo. Plus
            de médaillon avatar ici : la photo principale EST déjà la photo
            de profil (voir `photo` ci-dessus), un médaillon aurait juste
            dupliqué le même visage en plus petit. */}
        <div className="pt-3 pb-3 px-3.5">
          {spec && <p className="text-[9px] font-bold text-neutral-400 tracking-[0.1em] uppercase mb-0.5 truncate">{spec}</p>}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-neutral-900 font-bold text-[14px] leading-tight truncate">{r.name}</h3>
            {hasRating && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star size={10} className="fill-neutral-900 stroke-none" />
                <span className="text-neutral-900 text-[11px] font-bold">{r.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <p className="text-neutral-400 text-[11px] mt-0.5 truncate">
            {r.distance_km != null ? `à ${formatDistance(r.distance_km)}` : (r.city ?? '')}
          </p>
        </div>
      </div>
    </Link>
  );
}
