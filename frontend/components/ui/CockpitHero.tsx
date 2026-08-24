'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
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
 * En-tête du cockpit : un grand titre posé sur le blanc, puis un seul aplat
 * sombre pour la réputation métier. Avant, l'identité était éclatée entre une
 * ligne avatar/date et une carte noire chargée d'icônes ; ici la typographie
 * porte la hiérarchie et le noir ne sert plus qu'à une chose.
 */
export default function CockpitHero({ firstName, avatarUrl, dateStr, publicSlug, bestSpecialty, city }: Props) {
  const avatar = (
    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
      {avatarUrl
        ? <Image src={avatarUrl} alt={firstName} fill className="object-cover" sizes="48px" />
        : <div className="w-full h-full flex items-center justify-center text-base font-semibold text-neutral-400">{firstName[0]}</div>
      }
    </div>
  );

  return (
    <header>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] text-neutral-400 first-letter:uppercase">{dateStr}</p>
          <h1 className="text-[28px] font-bold text-neutral-900 tracking-[-0.02em] leading-tight mt-0.5 truncate">
            Bonjour, {firstName}
          </h1>
        </div>
        {publicSlug
          ? <Link href={`/app/coiffeur/${publicSlug}`} target="_blank" rel="noopener noreferrer" aria-label="Voir mon profil public">{avatar}</Link>
          : avatar}
      </div>

      {!bestSpecialty ? (
        <Link href="/pro/profil" className="mt-6 flex items-center gap-4 bg-neutral-900 rounded-[24px] p-6 hover:bg-neutral-800 transition-colors">
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-semibold text-white leading-snug">Choisissez vos spécialités</p>
            <p className="text-[13px] text-white/40 mt-1">C&apos;est ce qui construit votre réputation CHAIR.</p>
          </div>
          <ArrowRight size={18} className="text-white/40 flex-shrink-0" />
        </Link>
      ) : (
        <div className="mt-6 bg-neutral-900 rounded-[24px] px-6 py-7">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">
            {bestSpecialty.specialty_name}
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <p className="text-[30px] font-bold text-white tracking-[-0.02em] leading-none">
              {bestSpecialty.is_reference ? 'Légende' : bestSpecialty.level_name}
            </p>
            {bestSpecialty.local_rank && city && (bestSpecialty.local_total ?? 0) >= 2 && (
              <p className="text-[13px] text-white/40 flex-shrink-0 pb-1">
                <span className="font-semibold text-white/80">#{bestSpecialty.local_rank}</span> à {city}
              </p>
            )}
          </div>

          <Progress bestSpecialty={bestSpecialty} />
        </div>
      )}
    </header>
  );
}

function Progress({ bestSpecialty }: { bestSpecialty: ApiSpecialtyProgress }) {
  // Seuil réel du prochain niveau (renvoyé par le backend) — niveau max déjà
  // atteint : pas de barre à afficher, juste le score.
  const step = bestSpecialty.next_step;
  const target = step?.next_level_min ?? bestSpecialty.score;
  const pct = step ? Math.min(100, Math.round((bestSpecialty.score / target) * 100)) : 100;

  return (
    <>
      <div className="mt-6 h-[3px] bg-white/15 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[12px]">
        <p className="text-white/40 tabular-nums">
          {step ? `${bestSpecialty.score} / ${target} points` : `${bestSpecialty.score} points`}
        </p>
        {step && <p className="text-white/40 truncate">Objectif <span className="text-white/80">{step.next_level_name}</span></p>}
      </div>
    </>
  );
}
