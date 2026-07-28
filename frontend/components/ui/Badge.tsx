import type { ReactNode, ButtonHTMLAttributes } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'dark';

const TONE_CLS: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-500',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-500',
  dark: 'bg-neutral-900 text-white',
};

// Petit label statut (actif/inactif/en attente...) — remplace les
// `text-[10px] bg-X-50 text-X-600 px-2 py-0.5 rounded-full` recopiés à
// chaque écran avec des couleurs/tailles légèrement différentes à chaque fois.
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${TONE_CLS[tone]}`}>
      {children}
    </span>
  );
}

// Chip de filtre — sélectionnable, état actif net (fond noir) plutôt que
// des variantes de bordure discrètes difficiles à distinguer au pouce.
export function FilterChip({ active, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; children: ReactNode }) {
  return (
    <button
      className={`flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${
        active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
