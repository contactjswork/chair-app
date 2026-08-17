'use client';

import { Info } from 'lucide-react';
import type { RecommendationFallback } from '@/lib/recommendation';

interface Props {
  fallback: RecommendationFallback | null;
  /** Filtre spécialité abandonné faute de correspondance exacte. */
  specialtyRelaxed: boolean;
  /** Libellé(s) de la/les spécialité(s) demandée(s), pour le message. */
  specialtyLabel: string | null;
  /** Rayon exact tel que demandé par l'utilisateur (avant élargissement). */
  requestedRadius: number | null;
}

/**
 * Bandeau de repli honnête — jamais silencieux. Affiché en tête de liste dès
 * que le backend a dû s'écarter des critères exacts (voir
 * ExploreController::fallbackSearch), qu'il s'agisse d'un rayon élargi, d'une
 * spécialité relâchée, ou des deux à la fois. Même esprit que le badge de
 * repli de la home (RecommendationFallback), mais formulé en phrase complète
 * ici : la liste n'a pas de titre de section sur lequel accrocher un badge.
 */
export default function SearchFallbackBanner({ fallback, specialtyRelaxed, specialtyLabel, requestedRadius }: Props) {
  const isGeoFallback = !!fallback?.is_fallback;
  if (!isGeoFallback && !specialtyRelaxed) return null;

  let message: string;

  // Les libellés de palier ("Dans votre secteur", "Partout en France"...) sont
  // déjà des phrases autonomes correctement capitalisées — jamais de
  // .toLowerCase() dessus (ex: "france" en minuscule au milieu d'une phrase
  // se lit comme une faute), on les accroche après deux points à la place.
  if (specialtyRelaxed) {
    const subject = specialtyLabel ? `pour « ${specialtyLabel} »` : 'pour ces critères';
    message = isGeoFallback && fallback?.fallback_label
      ? `Aucun résultat exact ${subject}. Voici les mieux notés : ${fallback.fallback_label}.`
      : `Aucun résultat exact ${subject}. Voici les profils les mieux notés près de vous.`;
  } else {
    const nearLabel = requestedRadius != null ? `à moins de ${requestedRadius} km` : 'ici';
    message = `Aucun résultat exact ${nearLabel}. Voici les meilleurs profils${fallback?.fallback_label ? ` : ${fallback.fallback_label}` : ''}.`;
  }

  return (
    <div className="flex items-start gap-2 bg-neutral-50 border border-neutral-100 rounded-2xl px-3.5 py-3 mb-2.5">
      <Info size={14} className="flex-shrink-0 mt-0.5 text-neutral-400" />
      <p className="text-[12.5px] text-neutral-600 leading-relaxed">{message}</p>
    </div>
  );
}
