'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface OwnerEmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

interface OwnerEmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: OwnerEmptyStateAction;
  size?: 'md' | 'lg';
}

/** État vide standard côté gérant (équipe, offres, candidatures, fauteuils, notifications). */
export default function OwnerEmptyState({ icon: Icon, title, subtitle, action, size = 'md' }: OwnerEmptyStateProps) {
  const padding = size === 'lg' ? 'py-20 px-10' : 'py-16 px-8';
  const iconSize = size === 'lg' ? 40 : 36;
  const ActionIcon = action?.icon;

  // Refonte 16/09/2026 (passe « sobre comme Apple ») : icône libre, air
  // généreux, une ligne de sous-titre maximum.
  return (
    <div className={`bg-white rounded-[24px] ring-1 ring-neutral-100 ${padding} text-center`}>
      <Icon size={iconSize} className="text-neutral-200 mx-auto mb-5" strokeWidth={1.25} />
      <p className="text-[16px] font-bold text-neutral-900 mb-1">{title}</p>
      {subtitle && <p className="text-[13px] text-neutral-400 max-w-[240px] mx-auto mb-6">{subtitle}</p>}
      {action && (
        action.href ? (
          <Link href={action.href} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-4 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors">
            {ActionIcon && <ActionIcon size={12} />}{action.label}
          </Link>
        ) : (
          <button onClick={action.onClick} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-4 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors">
            {ActionIcon && <ActionIcon size={12} />}{action.label}
          </button>
        )
      )}
    </div>
  );
}
