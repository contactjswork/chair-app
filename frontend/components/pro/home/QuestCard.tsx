'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ApiNextBadge, ApiChairBadge } from '@/lib/types';
import { CARTE_TAP, MICRO_TITRE } from '@/lib/proStyle';

/**
 * Le prochain palier — ce qu'il reste exactement à faire.
 *
 * Un compteur de badges seul ne fait rien avancer : « 14 badges » est une
 * photo, pas une direction. Ce qui accroche, c'est l'écart chiffré au
 * prochain, et surtout le fait qu'il soit atteignable — « encore 3 avis »
 * donne envie, « encore 240 points » décourage.
 *
 * D'où le choix de ne montrer QU'UN objectif : le plus proche. Une liste de
 * huit défis à moitié entamés ne motive personne ; elle rappelle surtout tout
 * ce qui n'est pas fait.
 *
 * Le compte total reste, mais en petit et à côté : il dit le chemin parcouru
 * sans voler la vedette à ce qui vient.
 */

interface Props {
  nextBadges: ApiNextBadge[];
  unlocked: ApiChairBadge[];
  catalogueTotal: number;
}

export default function QuestCard({ nextBadges, unlocked, catalogueTotal }: Props) {
  // Le plus proche du but d'abord — c'est celui qu'on a le plus de chances
  // de décrocher, donc celui qui ramène.
  const objectif = [...nextBadges].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0] ?? null;

  const debloques = unlocked.length;

  return (
    <Link
      href="/pro/badges"
      className={`block ${CARTE_TAP} p-5`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={MICRO_TITRE}>Prochain palier</p>
        <ChevronRight size={16} className="text-neutral-300 shrink-0" />
      </div>

      {objectif ? (
        <>
          <p className="text-[17px] font-bold text-neutral-900 mt-3 leading-snug">
            {objectif.name}
          </p>
          <p className="text-[13px] text-neutral-500 mt-1.5 leading-relaxed">{resteAFaire(objectif)}</p>

          {/* Une barre, pas un anneau : on lit un reste à parcourir, pas une
              part de camembert. */}
          <div className="mt-4 h-2 rounded-full bg-neutral-100 shadow-[inset_0_1px_2px_rgba(10,10,10,0.08)] overflow-hidden">
            <div
              className="h-full rounded-full bg-neutral-900 shadow-[0_1px_3px_rgba(10,10,10,0.35)] transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(2, objectif.pct ?? 0))}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[12px] font-semibold text-neutral-900 tabular-nums">{objectif.pct ?? 0} %</span>
            <span className="text-[12px] text-neutral-400 tabular-nums">
              {debloques} badge{debloques > 1 ? 's' : ''} sur {catalogueTotal}
            </span>
          </div>
        </>
      ) : (
        <>
          <p className="text-[17px] font-bold text-neutral-900 mt-3">Tous les paliers en cours sont atteints</p>
          <p className="text-[13px] text-neutral-500 mt-1.5 tabular-nums">
            {debloques} badge{debloques > 1 ? 's' : ''} sur {catalogueTotal}
          </p>
        </>
      )}
    </Link>
  );
}

/**
 * Le reste à faire, dit en clair. L'API fournit soit un compteur brut
 * (7 sur 10), soit une phrase déjà rédigée pour les paliers de spécialité —
 * on utilise ce qui est le plus concret dans chaque cas.
 */
function resteAFaire(o: ApiNextBadge): string {
  if (o.type === 'specialty') return o.label;
  const manque = Math.max(0, o.target - o.current);
  if (manque === 0) return 'Palier atteint, il sera validé au prochain calcul.';
  return `Encore ${manque} sur ${o.target} · vous en êtes à ${o.current}`;
}
