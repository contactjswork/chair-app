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
// Refonte 16/09/2026 (passe « sobre comme Apple ») : l'icône respire seule —
// plus de petit carré gris autour — et l'espace fait le travail.
export default function EmptyState({ icon: Icon, title, subtitle, action, compact = false }: Props) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-10 px-4' : 'py-20 px-6'}`}>
      <Icon size={compact ? 28 : 36} className="text-neutral-200 mb-5" strokeWidth={1.25} />
      <p className="text-[16px] font-bold text-neutral-900 mb-1">{title}</p>
      {subtitle && <p className="text-[13px] text-neutral-400 max-w-[240px] mb-6">{subtitle}</p>}
      {action}
    </div>
  );
}
