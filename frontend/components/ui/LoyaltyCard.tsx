'use client';

import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { loyalty } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';
import type { ApiLoyaltyCard } from '@/lib/types';

/**
 * La carte de fidélité du client, sur la fiche du coiffeur.
 *
 * Elle ne s'affiche que si elle existe : coiffeur sans programme, visiteur
 * non connecté, client jamais venu — rien. Une carte vide n'incite pas,
 * elle encombre. La première visite scannée la fait apparaître, et c'est
 * le bon moment : le client vient de vivre le geste qui la fait avancer.
 *
 * Le rail reprend le vocabulaire de la série côté pro : segments pleins
 * posés, segments vides creusés. Même langage des deux côtés du comptoir.
 */
export default function LoyaltyCard({ hairdresserId }: { hairdresserId: number }) {
  const [carte, setCarte] = useState<ApiLoyaltyCard | null>(null);

  useEffect(() => {
    if (!getStoredToken()) return;
    let annule = false;
    loyalty
      .myCard(hairdresserId)
      .then((d) => { if (!annule && d.card && (d.card.progress > 0 || d.card.pending_rewards.length > 0)) setCarte(d.card); })
      .catch(() => {});
    return () => { annule = true; };
  }, [hairdresserId]);

  if (!carte) return null;

  const enAttente = carte.pending_rewards[0] ?? null;

  return (
    <div className="mx-4 mb-5 rounded-[22px] bg-white ring-1 ring-neutral-100 shadow-[0_1px_2px_rgba(10,10,10,0.04),0_10px_26px_-14px_rgba(10,10,10,0.14)] p-4">
      <div className="flex items-center gap-2">
        <Gift size={14} className="text-neutral-400 shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Votre carte de fidélité</p>
      </div>

      {enAttente ? (
        <p className="text-[14px] text-neutral-900 mt-2.5 leading-snug">
          <span className="font-bold">Récompense débloquée :</span> {enAttente.reward_label}.
          Montrez-la au salon.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-1 mt-3">
            {Array.from({ length: Math.min(carte.visits_required, 12) }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${
                  i < carte.progress
                    ? 'bg-neutral-900 shadow-[0_1px_3px_rgba(10,10,10,0.35)]'
                    : 'bg-neutral-100 shadow-[inset_0_1px_2px_rgba(10,10,10,0.08)]'
                }`}
              />
            ))}
          </div>
          <p className="text-[12.5px] text-neutral-500 mt-2.5 tabular-nums">
            {carte.progress} passage{carte.progress > 1 ? 's' : ''} sur {carte.visits_required} —{' '}
            encore {carte.visits_required - carte.progress} avant :{' '}
            <span className="font-semibold text-neutral-900">{carte.reward_label}</span>
          </p>
        </>
      )}
    </div>
  );
}
