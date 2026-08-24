'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ScoreItem } from '@/lib/profileScore';
import type { ApiSpecialtyProgress } from '@/lib/types';

interface Props {
  profileScore: number;
  topProfileItem: ScoreItem | null;
  bestSpecialty: ApiSpecialtyProgress | null;
}

/**
 * Les libellés de manque arrivent au singulier du backend ("réalisation",
 * "visite vérifiée", "avis"). Le simple `+ 's'` d'avant produisait "aviss"
 * et "visite vérifiées" : chaque mot s'accorde, sauf ceux déjà en -s.
 */
function plural(label: string, count: number): string {
  if (count <= 1) return label;
  return label.split(' ').map((w) => (w.endsWith('s') ? w : `${w}s`)).join(' ');
}

const SHELL = 'block bg-neutral-50 rounded-[20px] px-5 py-5 hover:bg-neutral-100/80 transition-colors';

/**
 * LA seule carte "quoi faire maintenant" du cockpit — fusionne ce qui étaient
 * NextActionCard et NextBadgeCard (même donnée source, bestSpecialty.next_step,
 * affichée deux fois séparément avant). Priorité : profil <50% d'abord (un
 * profil sans photo/bio n'attire personne, peu importe le niveau métier),
 * sinon le prochain palier métier avec le détail complet de ce qu'il manque.
 */
export default function NextStepCard({ profileScore, topProfileItem, bestSpecialty }: Props) {
  const useProfileItem = profileScore < 50 && topProfileItem;
  const step = bestSpecialty?.next_step;

  if (useProfileItem && topProfileItem) {
    return (
      <Link href={topProfileItem.href} className={`flex items-center gap-4 ${SHELL}`}>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-semibold text-neutral-900 leading-snug">{topProfileItem.label}</p>
          <p className="text-[13px] text-neutral-400 mt-1">Profil complété à {profileScore}%</p>
        </div>
        <ArrowRight size={18} className="text-neutral-300 flex-shrink-0" />
      </Link>
    );
  }

  if (step && step.gaps.length > 0) {
    const href = step.type === 'content' ? '/pro/portfolio' : '/pro/mon-qr';

    return (
      <Link href={href} className={SHELL}>
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-semibold text-neutral-900 leading-snug">
              Atteindre {step.next_level_name}
            </p>
            <p className="text-[13px] text-neutral-400 mt-1">en {step.specialty_name}</p>
          </div>
          <ArrowRight size={18} className="text-neutral-300 flex-shrink-0 mt-1" />
        </div>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {step.gaps.map((g) => (
            <p key={g.type} className="text-[13px] text-neutral-500">
              <span className="text-[15px] font-semibold text-neutral-900 tabular-nums">{g.missing}</span>
              {' '}{plural(g.label, g.missing)}
            </p>
          ))}
        </div>
      </Link>
    );
  }

  return (
    <div className={`${SHELL} hover:bg-neutral-50`}>
      <p className="text-[17px] font-semibold text-neutral-900 leading-snug">Tout est à jour</p>
      <p className="text-[13px] text-neutral-400 mt-1">Continuez à publier pour rester visible.</p>
    </div>
  );
}
