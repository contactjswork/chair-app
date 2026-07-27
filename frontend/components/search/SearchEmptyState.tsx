'use client';

import { RotateCcw, SearchX, WifiOff } from 'lucide-react';

interface Props {
  variant: 'empty' | 'error';
  message: string;
  radius: number | null;
  hasActiveFilters: boolean;
  onWidenRadius: (r: number | null) => void;
  onClearSpecialties?: (() => void) | null;
  onReset: () => void;
  onRetry?: () => void;
}

/** État "aucun résultat" / "erreur réseau" — propose toujours une sortie. */
export default function SearchEmptyState({
  variant, message, radius, hasActiveFilters, onWidenRadius, onClearSpecialties, onReset, onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-4">
        {variant === 'error'
          ? <WifiOff size={22} className="text-neutral-300" />
          : <SearchX size={22} className="text-neutral-300" />}
      </div>
      <h3 className="text-[15px] font-bold text-neutral-900 mb-1.5">
        {variant === 'error' ? 'Connexion impossible' : 'Aucun résultat'}
      </h3>
      <p className="text-[13px] text-neutral-400 max-w-xs leading-relaxed mb-5">{message}</p>

      <div className="flex flex-col items-center gap-2.5 w-full max-w-xs">
        {variant === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="w-full text-[13px] font-semibold text-white bg-neutral-900 px-5 py-3 rounded-2xl hover:bg-neutral-700 transition-colors"
          >
            Réessayer
          </button>
        )}

        {variant === 'empty' && radius != null && (
          <>
            {radius < 20 && (
              <button onClick={() => onWidenRadius(20)} className="w-full text-[13px] font-semibold text-neutral-700 border border-neutral-200 px-5 py-3 rounded-2xl hover:border-neutral-400 transition-colors">
                Élargir à 20 km
              </button>
            )}
            {radius < 50 && (
              <button onClick={() => onWidenRadius(50)} className="w-full text-[13px] font-semibold text-neutral-700 border border-neutral-200 px-5 py-3 rounded-2xl hover:border-neutral-400 transition-colors">
                Élargir à 50 km
              </button>
            )}
            <button onClick={() => onWidenRadius(null)} className="w-full text-[13px] font-semibold text-neutral-700 border border-neutral-200 px-5 py-3 rounded-2xl hover:border-neutral-400 transition-colors">
              Chercher dans toute la France
            </button>
          </>
        )}

        {variant === 'empty' && onClearSpecialties && (
          <button onClick={onClearSpecialties} className="text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors">
            Retirer les spécialités
          </button>
        )}

        {hasActiveFilters && (
          <button onClick={onReset} className="flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors">
            <RotateCcw size={12} />
            Réinitialiser tous les filtres
          </button>
        )}
      </div>
    </div>
  );
}
