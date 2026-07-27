'use client';

import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  label: string;
  sublabel?: string;
  active?: boolean;
  onClick: () => void;
  /** 'dark' pour les écrans d'arrivée (bg-neutral-950), 'light' pour l'onboarding post-inscription */
  variant?: 'dark' | 'light';
  compact?: boolean;
}

/**
 * Carte de choix illustrée réutilisée partout dans l'onboarding PRO — rôle,
 * statut indépendant/salarié, etc. Un seul composant pour ne pas dupliquer le
 * style de carte à chaque écran.
 */
export default function ChoiceCard({ icon: Icon, label, sublabel, active = false, onClick, variant = 'light', compact = false }: Props) {
  const isDark = variant === 'dark';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center text-center gap-2.5 rounded-2xl border-2 transition-all duration-150 active:scale-[0.96] ${
        compact ? 'py-4 px-3' : 'py-7 px-4'
      } ${
        isDark
          ? active
            ? 'border-white bg-white text-neutral-900'
            : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500'
          : active
            ? 'border-neutral-900 bg-neutral-50'
            : 'border-transparent bg-neutral-50 hover:bg-neutral-100'
      }`}
    >
      {active && (
        <span className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-900' : 'bg-neutral-900'}`}>
          <Check size={11} className="text-white" strokeWidth={3} />
        </span>
      )}
      {Icon && (
        <Icon size={compact ? 22 : 32} strokeWidth={1.5} className={isDark ? (active ? 'text-neutral-900' : 'text-neutral-400') : 'text-neutral-900'} />
      )}
      <div>
        <p className={`font-bold ${compact ? 'text-[13px]' : 'text-[16px]'} ${isDark && !active ? 'text-neutral-200' : ''}`}>{label}</p>
        {sublabel && (
          <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? (active ? 'text-neutral-500' : 'text-neutral-500') : 'text-neutral-400'}`}>
            {sublabel}
          </p>
        )}
      </div>
    </button>
  );
}
