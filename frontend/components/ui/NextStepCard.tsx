'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { METIER_LEVEL_ICONS } from '@/components/ui/ChairBadges';
import type { ScoreItem } from '@/lib/profileScore';
import type { ApiSpecialtyProgress } from '@/lib/types';

interface Props {
  profileScore: number;
  topProfileItem: ScoreItem | null;
  bestSpecialty: ApiSpecialtyProgress | null;
}

const LEVEL_NAMES = ['Novice', 'Débutant confirmé', 'Spécialiste', 'Expert', 'Référence locale', 'Référence régionale'];

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
      <Link href={topProfileItem.href} className="flex items-center gap-4 bg-neutral-900 rounded-2xl p-5 hover:bg-neutral-800 transition-colors">
        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-white" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400 mb-0.5">Prochaine étape</p>
          <p className="text-sm font-bold text-white">{topProfileItem.label}</p>
        </div>
        <ArrowRight size={16} className="text-neutral-500 flex-shrink-0" />
      </Link>
    );
  }

  if (step && step.gaps.length > 0) {
    const href = step.type === 'content' ? '/pro/portfolio' : '/pro/mon-qr';
    const levelIndex = LEVEL_NAMES.indexOf(step.next_level_name);
    const Icon = METIER_LEVEL_ICONS[levelIndex] ?? Sparkles;

    return (
      <Link href={href} className="block bg-neutral-900 rounded-2xl p-5 hover:bg-neutral-800 transition-colors">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-white" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400 mb-0.5">Prochaine étape</p>
            <p className="text-sm font-bold text-white">{step.next_level_name} · {step.specialty_name}</p>
          </div>
          <ArrowRight size={16} className="text-neutral-500 flex-shrink-0" />
        </div>
        <ul className="space-y-1.5 pl-1">
          {step.gaps.map((g) => (
            <li key={g.type} className="text-[13px] text-neutral-300 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-neutral-500 flex-shrink-0" />
              <span className="font-bold text-white">{g.missing}</span> {g.label}{g.missing > 1 ? 's' : ''} {step.specialty_name}
            </li>
          ))}
        </ul>
      </Link>
    );
  }

  return (
    <div className="bg-neutral-900 rounded-2xl p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
        <Sparkles size={18} className="text-white" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400 mb-0.5">Prochaine étape</p>
        <p className="text-sm font-bold text-white">Continuez à publier pour rester visible</p>
      </div>
    </div>
  );
}
