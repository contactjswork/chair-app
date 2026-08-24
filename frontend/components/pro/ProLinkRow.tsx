'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Ligne d'une liste groupée (fin de cockpit) — une seule carte, plusieurs
 *  entrées, au lieu d'une carte flottante par lien. */
export default function ProLinkRow({
  href, icon: Icon, title, subtitle, external = false,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 transition-colors"
    >
      <div className="w-9 h-9 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-neutral-500" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 truncate">{title}</p>
        {subtitle && <p className="text-xs text-neutral-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
    </Link>
  );
}
