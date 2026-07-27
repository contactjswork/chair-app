'use client';

import { Check } from 'lucide-react';

export interface GeoListItem {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  items: GeoListItem[];
  selected: string | null;
  onSelect: (value: string) => void;
  loading?: boolean;
  emptyLabel?: string;
  /** 'dark' pour l'inscription, 'light' pour l'onboarding post-inscription */
  theme?: 'dark' | 'light';
}

/**
 * Liste sélectionnable réutilisée pour le sélecteur en cascade Région →
 * Département de l'inscription pro (voir GeoController côté backend, seule
 * source de vérité pour ces listes).
 */
export default function GeoListPicker({ items, selected, onSelect, loading, emptyLabel = 'Aucun résultat', theme = 'dark' }: Props) {
  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className={`w-5 h-5 border-2 rounded-full animate-spin ${isDark ? 'border-neutral-700 border-t-white' : 'border-neutral-200 border-t-neutral-900'}`} />
      </div>
    );
  }

  if (!items.length) {
    return <p className={`text-[13px] text-center py-8 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{emptyLabel}</p>;
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const active = item.value === selected;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={`w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left transition-colors active:scale-[0.98] ${
              isDark
                ? active ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-neutral-200 active:bg-neutral-800'
                : active ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-900 active:bg-neutral-100'
            }`}
          >
            <span>
              <span className="font-bold text-[14px]">{item.label}</span>
              {item.sublabel && (
                <span className={`block text-[11px] mt-0.5 ${active ? 'opacity-60' : isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  {item.sublabel}
                </span>
              )}
            </span>
            {active && <Check size={16} strokeWidth={3} className="flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
