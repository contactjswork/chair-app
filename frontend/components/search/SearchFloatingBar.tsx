'use client';

import { Search, SlidersHorizontal } from 'lucide-react';

interface Props {
  /** Ligne principale — "Toutes les prestations" ou la recherche en cours */
  title: string;
  /** Ligne secondaire — "Position actuelle", ville ou "Toute la France" */
  subtitle: string;
  onOpenSearch: () => void;
  onOpenFilters: () => void;
  activeFiltersCount: number;
}

/** Barre de recherche flottante posée sur la carte. */
export default function SearchFloatingBar({ title, subtitle, onOpenSearch, onOpenFilters, activeFiltersCount }: Props) {
  return (
    <div
      className="flex items-center gap-2 bg-white rounded-full pl-4 pr-2 py-2 border border-neutral-100"
      style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.07)' }}
    >
      <button
        onClick={onOpenSearch}
        className="flex items-center gap-3 flex-1 min-w-0 text-left py-1 transition-transform active:scale-[0.98]"
        aria-label="Ouvrir la recherche"
      >
        <Search size={18} strokeWidth={2.2} className="text-neutral-900 flex-shrink-0" />
        <span className="min-w-0">
          <span className="block text-[14px] font-bold text-neutral-900 truncate leading-tight">{title}</span>
          <span className="block text-[12px] text-neutral-400 truncate leading-tight mt-0.5">{subtitle}</span>
        </span>
      </button>

      <button
        onClick={onOpenFilters}
        aria-label="Filtres"
        className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
          activeFiltersCount > 0
            ? 'bg-neutral-900 border-neutral-900 text-white'
            : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
        }`}
      >
        <SlidersHorizontal size={16} />
        {activeFiltersCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border border-neutral-900 text-neutral-900 text-[9px] font-bold flex items-center justify-center">
            {activeFiltersCount}
          </span>
        )}
      </button>
    </div>
  );
}
