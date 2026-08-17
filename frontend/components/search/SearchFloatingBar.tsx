'use client';

import { Search } from 'lucide-react';

interface Props {
  /** Ligne principale — "Toutes les prestations" ou la recherche en cours */
  title: string;
  /** Ligne secondaire — "Position actuelle", ville ou "Toute la France" */
  subtitle: string;
  onOpenSearch: () => void;
}

/** Barre de recherche flottante posée sur la carte — juste "quoi/où", le
 *  bouton Filtres n'est plus dupliqué ici : il vit uniquement dans l'en-tête
 *  de la liste de résultats, déjà visible en dessous. */
export default function SearchFloatingBar({ title, subtitle, onOpenSearch }: Props) {
  return (
    <button
      onClick={onOpenSearch}
      className="flex items-center gap-3 w-full min-w-0 text-left bg-white rounded-full pl-4 pr-4 py-3 border border-neutral-100 transition-transform active:scale-[0.98]"
      style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.07)' }}
      aria-label="Ouvrir la recherche"
    >
      <Search size={18} strokeWidth={2.2} className="text-neutral-900 flex-shrink-0" />
      <span className="min-w-0">
        <span className="block text-[14px] font-bold text-neutral-900 truncate leading-tight">{title}</span>
        <span className="block text-[12px] text-neutral-400 truncate leading-tight mt-0.5">{subtitle}</span>
      </span>
    </button>
  );
}
