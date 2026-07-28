import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  value: ReactNode;
  label: string;
  trend?: { value: string; positive?: boolean };
}

// Tuile chiffre + libellé — pattern répété (parrainage, business, badges...)
// à chaque fois avec une variante légèrement différente. `trend` optionnel
// pour répondre à "est-ce que ça progresse ?" sans que chaque page réinvente
// son propre indicateur de tendance.
export default function StatCard({ icon: Icon, value, label, trend }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4 text-center">
      {Icon && <Icon size={16} className="text-neutral-300 mx-auto mb-1.5" strokeWidth={1.75} />}
      <p className="text-xl font-bold text-neutral-900 leading-none">{value}</p>
      <p className="text-[10px] text-neutral-400 font-medium mt-1.5 uppercase tracking-wide">{label}</p>
      {trend && (
        <p className={`text-[10px] font-semibold mt-1 ${trend.positive ? 'text-emerald-600' : 'text-neutral-400'}`}>
          {trend.value}
        </p>
      )}
    </div>
  );
}
