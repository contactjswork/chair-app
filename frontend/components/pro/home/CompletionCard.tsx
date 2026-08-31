'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { CompletionResult } from '@/lib/profileCompletion';

/**
 * La complétion du profil.
 *
 * Cette carte a une particularité : elle doit disparaître. Un profil complet
 * n'a plus rien à dire ici, et laisser un « 100 % » en permanence
 * transformerait une consigne utile en décoration.
 *
 * Tant qu'il manque quelque chose, on ne liste pas les huit critères — on
 * nomme le seul qui rapporte le plus. Une consigne à la fois se fait ; huit
 * se remettent à demain.
 *
 * L'anneau plutôt qu'une barre : il occupe peu de place à côté du texte, et
 * cette carte n'a pas à peser autant que le classement ou la journée.
 */

interface Props {
  completion: CompletionResult;
}

export default function CompletionCard({ completion }: Props) {
  if (completion.pct >= 100 || !completion.next) return null;

  const { pct, next } = completion;

  return (
    <Link
      href={next.href}
      className="flex items-center gap-4 rounded-[24px] border border-neutral-100 p-5 active:bg-neutral-50 transition-colors"
    >
      <div
        className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center"
        style={{ background: `conic-gradient(#0a0a0a ${pct * 3.6}deg, #f5f5f5 0deg)` }}
      >
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
          <span className="text-[11px] font-bold text-neutral-900 tabular-nums">{pct}%</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-neutral-900">Profil complété à {pct} %</p>
        <p className="text-[13px] text-neutral-500 mt-0.5 truncate">
          Il manque : {next.label.toLowerCase()}
        </p>
      </div>

      <ChevronRight size={16} className="text-neutral-300 shrink-0" />
    </Link>
  );
}
