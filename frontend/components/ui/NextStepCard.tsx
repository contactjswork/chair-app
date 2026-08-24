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
 * Les libellés de manque arrivent au singulier du backend ("réalisation",
 * "visite vérifiée", "avis"). Le simple `+ 's'` d'avant produisait "aviss"
 * et "visite vérifiées" : chaque mot s'accorde, sauf ceux déjà en -s.
 */
function plural(label: string, count: number): string {
  if (count <= 1) return label;
  return label.split(' ').map((w) => (w.endsWith('s') ? w : `${w}s`)).join(' ');
}

const SHELL = 'block bg-white rounded-[22px] p-5 shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100 hover:shadow-[0_6px_18px_-6px_rgba(10,10,10,0.14)] transition-all';

/**
 * LA seule carte "quoi faire maintenant" du cockpit — fusionne ce qui étaient
 * NextActionCard et NextBadgeCard (même donnée source, bestSpecialty.next_step,
 * affichée deux fois séparément avant). Priorité : profil <50% d'abord (un
 * profil sans photo/bio n'attire personne, peu importe le niveau métier),
 * sinon le prochain palier métier avec le détail complet de ce qu'il manque.
 *
 * Fond blanc, pavé d'icône noir : le seul bloc sombre de la home est l'en-tête.
 * Quand quatre cartes sur onze étaient noires, "sombre" ne signalait plus rien.
 */
export default function NextStepCard({ profileScore, topProfileItem, bestSpecialty }: Props) {
  const useProfileItem = profileScore < 50 && topProfileItem;
  const step = bestSpecialty?.next_step;

  if (useProfileItem && topProfileItem) {
    return (
      <Link href={topProfileItem.href} className={`flex items-center gap-4 ${SHELL}`}>
        <div className="w-11 h-11 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-white" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900">{topProfileItem.label}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Profil complété à {profileScore}%</p>
        </div>
        <ArrowRight size={16} className="text-neutral-300 flex-shrink-0" />
      </Link>
    );
  }

  if (step && step.gaps.length > 0) {
    const href = step.type === 'content' ? '/pro/portfolio' : '/pro/mon-qr';
    const levelIndex = LEVEL_NAMES.indexOf(step.next_level_name);
    const Icon = METIER_LEVEL_ICONS[levelIndex] ?? Sparkles;

    return (
      <Link href={href} className={SHELL}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-white" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-neutral-900 leading-snug">{step.next_level_name} · {step.specialty_name}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {step.type === 'content' ? 'Publiez pour franchir ce palier' : 'Récoltez des avis certifiés'}
            </p>
          </div>
          <ArrowRight size={16} className="text-neutral-300 flex-shrink-0" />
        </div>
        <ul className="mt-4 pt-4 border-t border-neutral-50 space-y-1.5">
          {step.gaps.map((g) => (
            <li key={g.type} className="text-[13px] text-neutral-500 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-neutral-300 flex-shrink-0" />
              <span className="font-bold text-neutral-900">{g.missing}</span> {plural(g.label, g.missing)}
            </li>
          ))}
        </ul>
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${SHELL}`}>
      <div className="w-11 h-11 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
        <Sparkles size={18} className="text-white" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-neutral-900">Continuez à publier pour rester visible</p>
        <p className="text-xs text-neutral-400 mt-0.5">Tout est à jour de votre côté</p>
      </div>
    </div>
  );
}
