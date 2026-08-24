'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Liste groupée façon réglages iOS : un aplat doux, des filets fins entre les
 * lignes, la valeur alignée à droite. Remplace les cartes blanches cerclées
 * d'un liseré gris — sur un fond blanc, un contour transforme chaque bloc en
 * champ de formulaire ; un aplat, non.
 */
export function ProGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-50 rounded-[20px] overflow-hidden divide-y divide-neutral-200/60">
      {children}
    </div>
  );
}

export function ProGroupRow({
  href, icon: Icon, label, value, hint, external = false,
}: {
  href?: string;
  icon?: LucideIcon;
  label: string;
  value?: string;
  hint?: string;
  external?: boolean;
}) {
  const body = (
    <>
      {Icon && <Icon size={17} strokeWidth={1.75} className="text-neutral-400 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] text-neutral-900 leading-tight truncate">{label}</p>
        {hint && <p className="text-[12px] text-neutral-400 mt-1 leading-snug">{hint}</p>}
      </div>
      {value && <p className="text-[15px] font-semibold text-neutral-900 flex-shrink-0 tabular-nums">{value}</p>}
      {href && <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />}
    </>
  );

  const cls = 'flex items-center gap-3 px-4 py-3.5 min-h-[52px]';

  if (!href) return <div className={cls}>{body}</div>;

  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`${cls} hover:bg-neutral-100/70 active:bg-neutral-100 transition-colors`}
    >
      {body}
    </Link>
  );
}
