'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface OwnerStatProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  href?: string;
}

/** Tuile stat de la grille "Actions rapides" / résumé chiffré du cockpit gérant. */
export default function OwnerStat({ icon: Icon, value, label, href }: OwnerStatProps) {
  const content = (
    <>
      <Icon size={16} className="text-neutral-400" />
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-[11px] text-neutral-400 leading-tight">{label}</p>
    </>
  );
  const classes = 'bg-white rounded-2xl border border-neutral-100 p-4 flex flex-col gap-2 hover:border-neutral-200 transition-colors';

  if (href) return <Link href={href} className={classes}>{content}</Link>;
  return <div className={classes}>{content}</div>;
}
