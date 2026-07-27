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
  const padding = size === 'lg' ? 'p-12' : 'p-10';
  const iconSize = size === 'lg' ? 36 : 32;
  const ActionIcon = action?.icon;

  return (
    <div className={`bg-white rounded-2xl border border-neutral-100 ${padding} text-center`}>
      <Icon size={iconSize} className="text-neutral-200 mx-auto mb-3" />
      <p className="text-sm font-semibold text-neutral-700 mb-1">{title}</p>
      {subtitle && <p className="text-xs text-neutral-400 mb-4">{subtitle}</p>}
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
