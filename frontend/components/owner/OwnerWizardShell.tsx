'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import OwnerProgress from './OwnerProgress';

interface OwnerWizardShellProps {
  title: string;
  steps: string[];
  currentStep: number;
  onClose: () => void;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  /** Libellé du bouton à la dernière étape — "Publier" par défaut, "Mettre à jour" en édition par exemple. */
  publishLabel?: string;
  nextDisabled?: boolean;
  saving?: boolean;
  children: ReactNode;
}

/**
 * Coquille générique pour les wizards multi-étapes côté gérant (location de
 * fauteuil façon Airbnb, création d'offre d'emploi façon Indeed). Aucun
 * wizard à étapes n'existait avant dans l'app — fauteuils.tsx empilait tout
 * le formulaire en une seule page (voir audit). Un wizard concret
 * (OwnerChairWizard) se construit en assemblant cette coquille avec les
 * écrans propres à chaque étape — pas de logique métier ici.
 */
export default function OwnerWizardShell({
  title, steps, currentStep, onClose, onBack, onNext, nextLabel = 'Continuer', publishLabel = 'Publier', nextDisabled, saving, children,
}: OwnerWizardShellProps) {
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      <div className="pt-safe border-b border-neutral-100 flex-shrink-0">
        <div className="flex items-center justify-between px-4 h-14">
          <p className="text-sm font-bold text-neutral-900">{title}</p>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-neutral-100 flex-shrink-0">
        <OwnerProgress steps={steps} currentStep={currentStep} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {children}
      </div>

      <div className="pb-safe border-t border-neutral-100 flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-4">
          {onBack && (
            <button onClick={onBack} className="flex-1 py-3 text-sm font-semibold text-neutral-600 border border-neutral-200 rounded-2xl hover:bg-neutral-50 transition-colors">
              Retour
            </button>
          )}
          {onNext && (
            <button onClick={onNext} disabled={nextDisabled || saving}
              className="flex-1 py-3 text-sm font-semibold bg-neutral-900 text-white rounded-2xl hover:bg-neutral-700 transition-colors disabled:opacity-50">
              {saving ? 'Enregistrement...' : isLastStep ? publishLabel : nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
