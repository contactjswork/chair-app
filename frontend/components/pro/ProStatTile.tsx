'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/**
 * Tuile de progression compacte (2 par ligne). Remplace, sur la home, les
 * cartes pleine largeur Niveau/Streak/Classement/Profil qui prenaient à
 * elles seules quatre écrans de scroll pour quatre chiffres.
 */
export default function ProStatTile({
  href, icon: Icon, label, value, hint, progress, accent = false, wide = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string | null;
  progress?: number | null;
  /** Met l'icône en avant (streak actif aujourd'hui). */
  accent?: boolean;
  /** Occupe toute la largeur — utilisé pour fermer une grille impaire. */
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col justify-between gap-2 bg-white rounded-[20px] p-4 shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100 hover:shadow-[0_6px_18px_-6px_rgba(10,10,10,0.14)] transition-all ${wide ? 'col-span-2' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={13} strokeWidth={1.75} className={accent ? 'text-orange-500' : 'text-neutral-400'} />
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-neutral-400 truncate">{label}</p>
      </div>

      <p className="text-[15px] font-black text-neutral-900 leading-tight truncate">{value}</p>

      {progress != null && (
        <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${accent ? 'bg-orange-500' : 'bg-neutral-900'}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      {hint && <p className="text-[11px] text-neutral-400 leading-snug">{hint}</p>}
    </Link>
  );
}
