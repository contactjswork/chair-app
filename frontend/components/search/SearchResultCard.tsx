'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Building2, Heart, MapPin, Star, Users } from 'lucide-react';
import type { ExploreResult } from '@/lib/explore';
import { resultHref } from '@/lib/explore';
import { resolveMediaUrl } from '@/lib/types';
import { formatDistance } from '@/hooks/useGeolocation';
import { LEVEL_RING, ringGradientClass } from '@/lib/chairLevel';

interface Props {
  result: ExploreResult;
  selected?: boolean;
  /** null = favoris indisponibles (non connecté) — le cœur n'apparaît pas */
  isFavorite?: boolean | null;
  onToggleFavorite?: (r: ExploreResult) => void;
  onClick?: (r: ExploreResult) => void;
  compact?: boolean;
}

function fmtRating(r: number): string {
  return r.toFixed(1).replace('.', ',');
}

function fmtPrice(p: number): string {
  return Number.isInteger(p) ? String(p) : p.toFixed(2).replace('.', ',');
}

/**
 * Carte résultat unique pour salons et coiffeurs — même format, même poids
 * visuel. Un coiffeur salarié n'est jamais étiqueté "indépendant"/"salon" en
 * gros label : sa fiche montre sa photo et, s'il est en salon, une simple
 * ligne de contexte "Chez [Salon]", exactement au même niveau qu'un indépendant.
 *
 * Mise en page en trois colonnes (photo / infos / rail de note) : la note est
 * ancrée à droite en gros chiffre, comme dans le classement de la home, au lieu
 * d'être noyée dans une ligne de méta à 12px. Chaque information tient sur une
 * seule ligne qui tronque — la hauteur de la carte est donc dictée par son
 * contenu et non par la photo, ce qui supprime le vide vertical des anciennes
 * lignes de 118px systématiques.
 */
export default function SearchResultCard({ result: r, selected = false, isFavorite = null, onToggleFavorite, onClick, compact = false }: Props) {
  const isSalon = r.type === 'salon';
  // Coiffeur : photo de profil (même logique que le marqueur avatar sur la
  // carte) — la bannière est un visuel de portfolio, pas une photo de la personne.
  const image = resolveMediaUrl(isSalon ? r.image : (r.avatar ?? r.image));
  const hasRating = r.reviews_count > 0;
  const matched   = r.matched_pros[0];
  const size      = compact ? 56 : 68;

  const levelColor = r.chair_level?.color ?? 'neutral';
  const ring = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;

  const showHeart = !isSalon && isFavorite !== null && !!onToggleFavorite;

  // Contexte : une seule ligne, jamais trois empilées.
  const context =
    isSalon && r.team_count != null
      ? { Icon: Users, text: `${r.team_count} professionnel${r.team_count > 1 ? 's' : ''}` }
      : !isSalon && r.salon
        ? { Icon: Building2, text: `Chez ${r.salon.name}` }
        : matched
          ? { Icon: Users, text: `Avec ${matched.name}` }
          : null;

  const specialtyLine = r.specialties.slice(0, 3).map((s) => s.name).join(' · ');

  return (
    <div className="relative">
      <Link
        href={resultHref(r)}
        onClick={() => onClick?.(r)}
        className={`flex gap-3 p-3 rounded-2xl border bg-white transition-colors active:bg-neutral-50 ${
          selected ? 'border-neutral-900' : 'border-neutral-100 md:hover:border-neutral-300'
        }`}
      >
        {/* Visuel — cercle pour un coiffeur (sa photo, sa marque), coin arrondi
            pour un salon (photo d'un lieu). Anneau CHAIR autour de la photo si
            le coiffeur a un niveau de progression. */}
        <div
          className="relative flex-shrink-0 self-start"
          style={{ width: size, height: size }}
        >
          {!isSalon && ring.show && (
            <div className={`absolute inset-0 rounded-full ${ringGradientClass(levelColor)}`} />
          )}
          <div
            className={`relative overflow-hidden bg-neutral-100 ${isSalon ? 'rounded-xl' : 'rounded-full'} ${
              !isSalon && ring.show ? 'w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px]' : 'w-full h-full'
            }`}
          >
            {image ? (
              <Image src={image} alt={r.name} fill className="object-cover" sizes={`${size}px`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                <span className="text-[17px] font-bold text-neutral-400">{r.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Infos — une ligne par information, toutes tronquées */}
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-1.5 ${showHeart ? 'pr-7' : ''}`}>
            <h3 className="text-[14px] font-bold text-neutral-900 truncate leading-snug tracking-[-0.01em]">{r.name}</h3>
            {r.is_verified && <BadgeCheck size={13} className="text-neutral-900 flex-shrink-0" />}
            
            {r.is_chair_pick && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide bg-neutral-100 text-neutral-900 px-1.5 py-0.5 rounded-full flex-shrink-0">
                <Heart size={9} fill="currentColor" />Coup de cœur
              </span>
            )}
          </div>

          {(r.distance_km != null || r.city) && (
            <p className="flex items-center gap-1 text-[12px] text-neutral-500 mt-1 truncate">
              <MapPin size={11} className="flex-shrink-0 text-neutral-400" />
              <span className="truncate">
                {r.distance_km != null ? formatDistance(r.distance_km) : r.city}
                {r.distance_km != null && r.city ? ` · ${r.city}` : ''}
              </span>
            </p>
          )}

          {/* Contexte discret — jamais un label de catégorie */}
          {context && (
            <p className="flex items-center gap-1 text-[11.5px] text-neutral-400 mt-0.5 truncate">
              <context.Icon size={10} className="flex-shrink-0" />
              <span className="truncate">{context.text}</span>
            </p>
          )}

          {/* Spécialités + prix sur une seule ligne : l'ancienne rangée de
              pastilles 9px en capitales passait à la ligne et alourdissait
              chaque carte sans jamais devenir lisible. */}
          {(specialtyLine || r.price_from != null) && (
            <p className="flex items-baseline gap-2 mt-1.5 text-[11.5px]">
              {specialtyLine && <span className="text-neutral-500 truncate">{specialtyLine}</span>}
              {r.price_from != null && (
                <span className="flex-shrink-0 font-semibold text-neutral-900 tabular-nums">
                  dès {fmtPrice(r.price_from)} €
                </span>
              )}
            </p>
          )}
        </div>

        {/* Rail de note — ancre visuelle à droite, toujours occupée pour que
            le rythme des lignes ne se casse pas sur un profil sans avis. */}
        <div className="flex flex-col items-end justify-end flex-shrink-0 pl-1">
          {hasRating ? (
            <>
              <span className="flex items-center gap-0.5 text-neutral-900">
                <Star size={11} className="fill-neutral-900 stroke-none" />
                <span className="text-[15px] font-bold leading-none tabular-nums">{fmtRating(r.avg_rating)}</span>
              </span>
              <span className="text-[10px] text-neutral-400 mt-1 tabular-nums whitespace-nowrap">{r.reviews_count} avis</span>
            </>
          ) : (
            <span className="text-[10px] font-semibold text-neutral-400 whitespace-nowrap">Nouveau</span>
          )}
        </div>
      </Link>

      {/* Favori — coiffeurs uniquement (les salons n'ont pas de favoris) */}
      {showHeart && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite!(r); }}
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="absolute top-2 right-2 w-8 h-8 before:absolute before:-inset-1.5 before:content-[''] rounded-full flex items-center justify-center transition-transform active:scale-90"
        >
          <Heart
            size={16}
            className={isFavorite ? 'fill-neutral-900 stroke-neutral-900' : 'stroke-neutral-300'}
            strokeWidth={1.8}
          />
        </button>
      )}
    </div>
  );
}
