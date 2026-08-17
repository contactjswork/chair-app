'use client';

import { CHAIR_COMMISSION_RATE } from '@/lib/types';

interface Props {
  pricePerDay: string;
  pricePerWeek: string;
  pricePerMonth: string;
  depositAmount: string;
  onChange: (patch: Partial<{ price_per_day: string; price_per_week: string; price_per_month: string; deposit_amount: string }>) => void;
}

const inputCls = 'w-full pl-4 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all';

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{label}</label>
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

/** Tarification jour/semaine/mois/dépôt avec estimation de revenu net live (après commission plateforme). */
export default function PricingStep({ pricePerDay, pricePerWeek, pricePerMonth, depositAmount, onChange }: Props) {
  const monthly = pricePerMonth ? parseFloat(pricePerMonth)
    : pricePerWeek ? parseFloat(pricePerWeek) * 4
    : pricePerDay ? parseFloat(pricePerDay) * 20
    : null;

  const net = monthly !== null && !isNaN(monthly) ? monthly * (1 - CHAIR_COMMISSION_RATE) : null;

  return (
    <div className="space-y-4">
      <Field label="Prix / jour" value={pricePerDay} onChange={(v) => onChange({ price_per_day: v })} placeholder="40" />
      <Field label="Prix / semaine" value={pricePerWeek} onChange={(v) => onChange({ price_per_week: v })} placeholder="180" />
      <Field label="Prix / mois" value={pricePerMonth} onChange={(v) => onChange({ price_per_month: v })} placeholder="600" />
      <Field label="Dépôt de garantie (optionnel)" value={depositAmount} onChange={(v) => onChange({ deposit_amount: v })} placeholder="200" />

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
