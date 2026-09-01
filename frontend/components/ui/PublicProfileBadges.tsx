'use client';

import { useState } from 'react';
import { Trophy } from 'lucide-react';
import type { ApiChairBadge, ApiRarity } from '@/lib/types';
import { BadgeMedallion, BadgeExplainSheet } from './ChairBadges';

// ── Onglet "Badges" du profil public — vitrine à trophées façon Strava ───────
// Tous les badges obtenus par le coiffeur, groupés du plus prestigieux au plus
// commun. Chaque médaillon s'ouvre sur son explication (BadgeExplainSheet,
// avec la date réelle de déblocage). Données : chair_badges_all (uniquement
// des badges réellement débloqués — jamais de catalogue verrouillé côté
// client, la collection d'un coiffeur n'est pas une page marketing).

const RARITY_ORDER: ApiRarity[] = ['ultime', 'legendaire', 'epique', 'rare', 'commun'];

const RARITY_LABELS: Record<ApiRarity, string> = {
  ultime:     'Ultime',
  legendaire: 'Légendaires',
  epique:     'Épiques',
  rare:       'Rares',
  commun:     'Communs',
};

interface Props {
  badges: ApiChairBadge[];
  coiffeurName: string;
}

export default function PublicProfileBadges({ badges, coiffeurName }: Props) {
  const [selected, setSelected] = useState<ApiChairBadge | null>(null);

  if (!badges.length) {
    return (
      <div className="px-4 md:px-0 py-10 text-center">
        <Trophy size={22} strokeWidth={1.5} className="mx-auto text-neutral-300 mb-3" />
        <p className="text-[13px] text-neutral-400">Aucun badge débloqué pour le moment.</p>
      </div>
    );
  }

  const groups = RARITY_ORDER
    .map((rarity) => ({
      rarity,
      items: badges
        .filter((b) => b.rarity === rarity)
        .sort((a, b) => b.pts - a.pts),
    }))
    .filter((g) => g.items.length > 0);

  const firstName = coiffeurName.split(' ')[0];

  return (
    <div className="px-4 md:px-0">

      {/* En-tête : le statut d'abord, le détail ensuite */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400 mb-1">Trophées CHAIR</p>
          <p className="text-[15px] font-bold text-neutral-900 leading-tight">
            {badges.length} badge{badges.length > 1 ? 's' : ''} obtenu{badges.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Sections par rareté — du plus prestigieux au plus commun */}
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.rarity}>
            <div className="flex items-center gap-2.5 mb-4">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 whitespace-nowrap">
                {RARITY_LABELS[g.rarity]}
              </p>
              <span className="h-px flex-1 bg-neutral-100" />
              <span className="text-[11px] text-neutral-500 tabular-nums">{g.items.length}</span>
            </div>
            <div className="grid grid-cols-4 gap-x-2 gap-y-5">
              {g.items.map((b) => (
                <button
                  key={b.code}
                  onClick={() => setSelected(b)}
                  className="flex flex-col items-center gap-1.5 text-center active:scale-95 transition-transform"
                >
                  <BadgeMedallion code={b.code} tier={b.tier} size={52} />
                  <span className="text-[10px] font-semibold text-neutral-600 leading-tight line-clamp-2">{b.name}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="text-[11px] text-neutral-400 leading-relaxed mt-8">
        Chaque badge récompense une étape réelle du parcours de {firstName} sur CHAIR — avis vérifiés,
        réalisations publiées, régularité, ancienneté. Touchez un badge pour découvrir son histoire.
      </p>

      <BadgeExplainSheet badge={selected} onClose={() => setSelected(null)} coiffeurName={coiffeurName} />
    </div>
  );
}
