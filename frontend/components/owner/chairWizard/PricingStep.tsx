'use client';

import { Lightbulb, AlertTriangle } from 'lucide-react';
import { CHAIR_COMMISSION_RATE } from '@/lib/types';

interface Props {
  pricePerDay: string;
  pricePerWeek: string;
  pricePerMonth: string;
  depositAmount: string;
  onChange: (patch: Partial<{ price_per_day: string; price_per_week: string; price_per_month: string; deposit_amount: string }>) => void;
}

const inputCls = 'w-full pl-4 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-[16px] focus:outline-none focus:border-neutral-400 focus:bg-white transition-all';

// ── Repères marché France (location de fauteuil, 2026) — fourchettes larges,
// la ville et le standing font le reste. Servent aux textes ET aux garde-fous.
const REPERES = { jourMin: 25, jourMax: 55, semaineMax: 220, moisMax: 750 };

/** Arrondi commerçant : 47 → 45, 178 → 180. */
function arrondi5(n: number): number {
  return Math.round(n / 5) * 5;
}

/**
 * Suggestions dégressives depuis le prix/jour — la logique de toute location :
 * s'engager plus longtemps doit coûter moins cher à l'unité.
 *   semaine ≈ 5 jours − 15 %   ·   mois ≈ 20 jours − 30 %
 */
function suggestions(day: number): { semaine: number; mois: number } {
  return {
    semaine: arrondi5(day * 5 * 0.85),
    mois: arrondi5(day * 20 * 0.7),
  };
}

function Field({ label, value, onChange, placeholder, suggestion, onSuggestion }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Prix conseillé (dérivé du prix/jour) — affiché tant que le champ est vide. */
  suggestion?: number | null;
  onSuggestion?: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="block text-xs font-semibold text-neutral-700">{label}</label>
        {suggestion != null && !value && onSuggestion && (
          <button
            type="button"
            onClick={() => onSuggestion(suggestion)}
            className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 underline underline-offset-2 decoration-neutral-300 transition-colors"
          >
            Conseillé : {suggestion} €
          </button>
        )}
      </div>
      <div className="relative">
        <input
          type="number" min="0" step="0.5" inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">€</span>
      </div>
    </div>
  );
}

/**
 * Tarification jour/semaine/mois/dépôt — refonte 15/09/2026 (retour Julien :
 * « aide le gérant, conseille-lui des prix raisonnables ») :
 *  - repères marché affichés d'entrée ;
 *  - prix semaine/mois CONSEILLÉS dès que le prix/jour est saisi (un tap
 *    pour remplir), dégressifs comme toute location qui veut se louer ;
 *  - garde-fous honnêtes quand un tarif est incohérent (mois plus cher que
 *    20 jours à l'unité…) ou au-dessus des repères — on prévient, on
 *    n'interdit jamais : c'est son salon, son prix.
 * L'estimation de revenu net (commission déduite) reste en bas.
 */
export default function PricingStep({ pricePerDay, pricePerWeek, pricePerMonth, depositAmount, onChange }: Props) {
  const day = pricePerDay ? parseFloat(pricePerDay) : null;
  const week = pricePerWeek ? parseFloat(pricePerWeek) : null;
  const month = pricePerMonth ? parseFloat(pricePerMonth) : null;

  const sugg = day != null && !isNaN(day) && day > 0 ? suggestions(day) : null;

  // Garde-fous — un seul à la fois, le plus important d'abord.
  const alerte = (() => {
    if (day != null && week != null && week > day * 6) {
      return `Votre semaine (${week} €) coûte plus que 6 jours à l'unité — un engagement plus long doit coûter moins cher.`;
    }
    if (day != null && month != null && month > day * 20) {
      return `Votre mois (${month} €) dépasse 20 jours à l'unité — les coiffeurs loueront au jour, jamais au mois.`;
    }
    if (week != null && month != null && month > week * 4) {
      return `Votre mois (${month} €) coûte plus que 4 semaines — pensez dégressif.`;
    }
    if (day != null && day > REPERES.jourMax) {
      return `${day} €/jour est au-dessus des repères marché (${REPERES.jourMin}–${REPERES.jourMax} €) — justifiez-le par le standing et les photos.`;
    }
    if (month != null && month > REPERES.moisMax) {
      return `${month} €/mois est au-dessus des repères marché (jusqu'à ~${REPERES.moisMax} €) — assurez-vous que l'annonce le justifie.`;
    }
    return null;
  })();

  const monthly = month ?? (week != null ? week * 4 : day != null ? day * 20 : null);
  const net = monthly !== null && !isNaN(monthly) ? monthly * (1 - CHAIR_COMMISSION_RATE) : null;

  return (
    <div className="space-y-4">
      {/* Repères marché — pour partir d'un prix raisonnable, pas au hasard. */}
      <div className="flex items-start gap-2.5 bg-neutral-50 ring-1 ring-neutral-100 rounded-2xl px-4 py-3">
        <Lightbulb size={14} className="text-neutral-500 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-neutral-600 leading-relaxed">
          Repères en France : <span className="font-semibold text-neutral-900">{REPERES.jourMin}–{REPERES.jourMax} €/jour</span> ·
          jusqu&apos;à <span className="font-semibold text-neutral-900">{REPERES.semaineMax} €/semaine</span> et{' '}
          <span className="font-semibold text-neutral-900">{REPERES.moisMax} €/mois</span> — selon la ville et le standing.
        </p>
      </div>

      <Field label="Prix / jour" value={pricePerDay} onChange={(v) => onChange({ price_per_day: v })} placeholder="40" />
      <Field
        label="Prix / semaine" value={pricePerWeek} onChange={(v) => onChange({ price_per_week: v })} placeholder="170"
        suggestion={sugg?.semaine} onSuggestion={(v) => onChange({ price_per_week: String(v) })}
      />
      <Field
        label="Prix / mois" value={pricePerMonth} onChange={(v) => onChange({ price_per_month: v })} placeholder="550"
        suggestion={sugg?.mois} onSuggestion={(v) => onChange({ price_per_month: String(v) })}
      />
      <Field label="Dépôt de garantie (optionnel)" value={depositAmount} onChange={(v) => onChange({ deposit_amount: v })} placeholder="200" />

      {alerte && (
        <div className="flex items-start gap-2.5 bg-amber-50 rounded-2xl px-4 py-3">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-700 leading-relaxed">{alerte}</p>
        </div>
      )}

      {net !== null && (
        <div className="bg-neutral-900 rounded-[22px] p-5 text-white">
          <p className="text-[11px] uppercase tracking-wide text-neutral-400 font-bold mb-1">Estimation revenu net / mois</p>
          <p className="text-2xl font-bold">{net.toFixed(0)} €</p>
          <p className="text-[11px] text-neutral-400 mt-1">
            Basé sur {monthly?.toFixed(0)} €/mois, commission CHAIR {(CHAIR_COMMISSION_RATE * 100).toFixed(0)}% déduite — estimation, pas un paiement réel.
          </p>
        </div>
      )}
    </div>
  );
}
