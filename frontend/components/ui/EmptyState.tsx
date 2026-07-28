import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
}

// État vide partagé — jusqu'ici chaque page recréait sa propre structure
// icône/titre/sous-texte/CTA avec des tailles et espacements différents.
// `compact` réduit le padding vertical pour les états vides imbriqués
// (dans une card ou une section, pas en plein écran).
export default function EmptyState({ icon: Icon, title, subtitle, action, compact = false }: Props) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-8 px-4' : 'py-14 px-6'}`}>
      <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-4">
        <Icon size={20} className="text-neutral-300" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-bold text-neutral-900 mb-1">{title}</p>
      {subtitle && <p className="text-[13px] text-neutral-400 leading-relaxed max-w-xs mb-5">{subtitle}</p>}
      {action}
    </div>
  );
}
