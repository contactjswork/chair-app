'use client';

import { ArrowLeft } from 'lucide-react';

interface Props {
  /** 0 à 100 */
  progress: number;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}

/**
 * En-tête commun à tous les écrans d'onboarding plein écran (inscription ET
 * post-inscription) — retour à gauche, barre de progression au centre,
 * "Passer" à droite. Jamais bloquant : Passer reste toujours atteignable.
 */
export default function OnboardingHeader({ progress, onBack, onSkip, skipLabel = 'Passer' }: Props) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-5 pb-4 pt-safe-5">
      <div className="w-8 flex justify-start">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Retour"
            className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      <div className="flex-1 h-[3px] bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-neutral-900 rounded-full transition-all duration-400 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>

      <div className="w-12 flex justify-end">
        {onSkip && (
          <button onClick={onSkip} className="text-[13px] font-medium text-neutral-400 hover:text-neutral-700 transition-colors whitespace-nowrap">
            {skipLabel}
          </button>
        )}
      </div>
    </div>
  );
}
