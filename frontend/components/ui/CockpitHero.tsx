'use client';

import Link from 'next/link';
import Image from 'next/image';
import { METIER_LEVEL_ICONS } from '@/components/ui/ChairBadges';
import { Scissors, ArrowRight, Eye } from 'lucide-react';
import type { ApiSpecialtyProgress } from '@/lib/types';

interface Props {
  firstName: string;
  avatarUrl: string | null;
  dateStr: string;
  publicSlug: string | null;
  bestSpecialty: ApiSpecialtyProgress | null;
  city: string | null;
}

/**
 * En-tête du cockpit — absorbe la ligne d'identité (avatar + date + accès au
 * profil public) qui flottait juste au-dessus : deux surfaces disaient "qui
 * tu es" avant même le premier contenu utile.
 */
export default function CockpitHero({ firstName, avatarUrl, dateStr, publicSlug, bestSpecialty, city }: Props) {
  return (
    <div className="bg-neutral-900 rounded-[26px] p-5 shadow-[0_10px_30px_-14px_rgba(10,10,10,0.4)]">
      <div className="flex items-center gap-3">
        <div className="relative w-11 h-11 rounded-full overflow-hidden bg-white/10 flex-shrink-0 ring-1 ring-white/15">
          {avatarUrl
            ? <Image src={avatarUrl} alt={firstName} fill className="object-cover" sizes="44px" />
            : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/60">{firstName[0]}</div>
          }
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-white/40 capitalize truncate">{dateStr}</p>
          <h1 className="text-lg font-bold text-white leading-tight truncate">Bonjour, {firstName}</h1>
        </div>
        {publicSlug && (
          <Link
            href={`/app/coiffeur/${publicSlug}`} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-white/70 bg-white/10 px-3 py-2 rounded-xl hover:bg-white/20 hover:text-white transition-colors flex-shrink-0"
          >
            <Eye size={12} />Mon profil
          </Link>
        )}
      </div>

      {!bestSpecialty ? (
        <div className="mt-5 pt-4 border-t border-white/10">
          <p className="text-sm text-neutral-400">Choisissez vos spécialités pour construire votre réputation CHAIR.</p>
          <Link href="/pro/profil" className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold bg-white text-neutral-900 px-4 py-2.5 rounded-xl">
            Choisir mes spécialités <ArrowRight size={12} />
          </Link>
        </div>
      ) : (
        <SpecialtyBlock bestSpecialty={bestSpecialty} city={city} />
      )}
    </div>
  );
}

function SpecialtyBlock({ bestSpecialty, city }: { bestSpecialty: ApiSpecialtyProgress; city: string | null }) {
  const Icon = METIER_LEVEL_ICONS[bestSpecialty.level] ?? Scissors;
  // Seuil réel du prochain niveau (renvoyé par le backend) — niveau max déjà
  // atteint : pas de barre à afficher, juste le score.
  const target = bestSpecialty.next_step?.next_level_min ?? bestSpecialty.score;
  const pct = bestSpecialty.next_step ? Math.min(100, Math.round((bestSpecialty.score / target) * 100)) : 100;

  return (
    <div className="mt-5 pt-4 border-t border-white/10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40 truncate">{bestSpecialty.specialty_name}</p>
          <p className="text-lg font-black text-white leading-none mt-0.5">
            {bestSpecialty.is_reference ? 'Légende' : bestSpecialty.level_name}
          </p>
        </div>
        {bestSpecialty.local_rank && city && (bestSpecialty.local_total ?? 0) >= 2 && (
          <div className="ml-auto text-right flex-shrink-0">
            <p className="text-lg font-black text-white leading-none">#{bestSpecialty.local_rank}</p>
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
