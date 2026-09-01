'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import BottomSheet from '@/components/ui/BottomSheet';
import { Target, Pencil } from 'lucide-react';

/**
 * L'objectif mensuel — le CA que le coiffeur SE fixe (lot du 01/09/2026).
 *
 * Motivation personnelle, jamais comparée à qui que ce soit : pas de
 * classement, pas de moyenne des autres, juste sa barre à lui. Sans
 * objectif posé, la carte invite à en poser un — sobrement.
 */

interface Goal {
  goal: number | null;
  current: number;
}

export default function GoalCard() {
  const [data, setData] = useState<Goal | null>(null);
  const [sheetOuvert, setSheetOuvert] = useState(false);
  const [montant, setMontant] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    api.get<Goal>('/my-goal').then(setData).catch(() => {});
  }, []);

  async function enregistrer(valeur: number | null) {
    setEnregistrement(true);
    try {
      const r = await api.put<{ goal: number | null }>('/my-goal', { amount: valeur });
      setData((d) => ({ goal: r.goal, current: d?.current ?? 0 }));
      setSheetOuvert(false);
    } catch {}
    setEnregistrement(false);
  }

  if (data === null) return null;

  const pct = data.goal ? Math.min(100, Math.round((data.current / data.goal) * 100)) : 0;
  const moisLabel = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  return (
    <>
      <section>
        {data.goal ? (
          <button
            onClick={() => { setMontant(String(data.goal)); setSheetOuvert(true); }}
            className="w-full text-left bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4 hover:shadow-[0_8px_22px_-8px_rgba(10,10,10,0.16)] transition-all"
          >
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 flex items-center gap-1.5">
                <Target size={12} />Objectif de {moisLabel}
              </p>
              <Pencil size={12} className="text-neutral-300" />
            </div>
            <div className="flex items-end justify-between gap-3 mb-2">
              <p className="text-[24px] font-bold text-neutral-900 leading-none tabular-nums">
                {Math.round(data.current)} €
                <span className="text-[14px] font-semibold text-neutral-400"> / {data.goal} €</span>
              </p>
              <p className={`text-[13px] font-bold tabular-nums ${pct >= 100 ? 'text-green-600' : 'text-neutral-500'}`}>{pct} %</p>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-green-500' : 'bg-neutral-900'}`}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
            {pct >= 100 && (
              <p className="text-[11px] font-semibold text-green-600 mt-2">Objectif atteint — bravo.</p>
            )}
          </button>
        ) : (
          <button
            onClick={() => { setMontant(''); setSheetOuvert(true); }}
            className="w-full flex items-center gap-3 bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4 text-left hover:shadow-[0_8px_22px_-8px_rgba(10,10,10,0.16)] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Target size={17} className="text-neutral-500" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-900">Fixez-vous un objectif du mois</p>
              <p className="text-xs text-neutral-400 mt-0.5">Votre CA cible, visible par vous seul.</p>
            </div>
          </button>
        )}
      </section>

      {sheetOuvert && (
        <BottomSheet onClose={() => setSheetOuvert(false)}>
          <div className="px-5 pb-safe-5">
            <p className="text-[20px] font-bold text-neutral-900 mb-1">Objectif de {moisLabel}</p>
            <p className="text-[12px] text-neutral-400 mb-4">
              Le CA que vous visez ce mois-ci — personnel, jamais comparé.
            </p>
            <div className="relative mb-4">
              <input
                type="number"
                inputMode="numeric"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="2400"
                min={100}
                max={50000}
                autoFocus
                className="w-full bg-neutral-50 ring-1 ring-neutral-100 rounded-xl pl-4 pr-10 py-3.5 text-[18px] font-bold tabular-nums focus:outline-none focus:ring-neutral-300 transition-all placeholder:text-neutral-300 placeholder:font-normal"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-neutral-400">€</span>
            </div>
            <button
              onClick={() => { const v = parseInt(montant); if (!isNaN(v) && v >= 100) enregistrer(v); }}
              disabled={enregistrement || !montant || parseInt(montant) < 100}
              className="w-full py-3.5 rounded-2xl bg-neutral-900 text-white text-[15px] font-bold disabled:opacity-40 hover:bg-neutral-700 transition-colors"
            >
              {enregistrement ? 'Enregistrement…' : 'Fixer l’objectif'}
            </button>
            {data.goal && (
              <button
                onClick={() => enregistrer(null)}
                disabled={enregistrement}
                className="w-full py-3 mt-1.5 text-[13px] font-semibold text-neutral-400 hover:text-red-500 transition-colors"
              >
                Retirer l&apos;objectif
              </button>
            )}
          </div>
        </BottomSheet>
      )}
    </>
  );
}
