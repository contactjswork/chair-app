'use client';

import { METIER_LEVEL_ICONS } from '@/components/ui/ChairBadges';
import { Scissors, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ApiSpecialtyProgress } from '@/lib/types';

function rankMedal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export default function CockpitHero({
  firstName, bestSpecialty, city,
}: { firstName: string; bestSpecialty: ApiSpecialtyProgress | null; city: string | null }) {
  if (!bestSpecialty) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-white mb-1">Bonjour, {firstName} 👋</h1>
        <p className="text-sm text-neutral-400">Choisissez vos spécialités pour commencer à construire votre réputation CHAIR.</p>
        <Link href="/pro/profil" className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold bg-white text-neutral-900 px-4 py-2.5 rounded-xl">
          Choisir mes spécialités <ArrowRight size={12} />
        </Link>
      </div>
    );
  }

  const Icon = METIER_LEVEL_ICONS[bestSpecialty.level] ?? Scissors;
  // Seuil réel du prochain niveau (renvoyé par le backend) — niveau max déjà
  // atteint : pas de barre à afficher, juste le score.
  const target = bestSpecialty.next_step?.next_level_min ?? bestSpecialty.score;
  const pct = bestSpecialty.next_step ? Math.min(100, Math.round((bestSpecialty.score / target) * 100)) : 100;

  return (
    <div className="bg-neutral-900 rounded-2xl p-6">
      <h1 className="text-xl font-bold text-white mb-4">Bonjour, {firstName} 👋</h1>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40">{bestSpecialty.specialty_name}</p>
          <p className="text-lg font-black text-white leading-none mt-0.5">
            {bestSpecialty.is_reference ? 'Légende' : bestSpecialty.level_name}
          </p>
        </div>
        {bestSpecialty.local_rank && city && (bestSpecialty.local_total ?? 0) >= 2 && (
          <div className="ml-auto text-right flex-shrink-0">
            <p className="text-lg font-black text-white leading-none">{rankMedal(bestSpecialty.local_rank)}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{city}</p>
          </div>
        )}
      </div>

      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-white/50">
          {bestSpecialty.next_step ? `${bestSpecialty.score} / ${target} points` : `${bestSpecialty.score} points`}
        </p>
        {bestSpecialty.next_step && (
          <p className="text-[11px] font-semibold text-white/50">
            Objectif : <span className="text-white/80">{bestSpecialty.next_step.next_level_name}</span>
          </p>
        )}
      </div>
    </div>
  );
}
