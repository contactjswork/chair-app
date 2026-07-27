'use client';

import { Check } from 'lucide-react';

interface OwnerProgressProps {
  steps: string[];
  currentStep: number;
}

/**
 * Indicateur d'étapes pour les wizards gérant (location de fauteuil, offre
 * d'emploi...). Aucun équivalent n'existait déjà dans l'app — seul le
 * segmented-tab (bg-neutral-100 rounded-2xl p-1) existait pour un choix
 * binaire, pas pour une progression à N étapes ordonnées.
 */
export default function OwnerProgress({ steps, currentStep }: OwnerProgressProps) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="flex items-center w-full">
              {i > 0 && <div className={`flex-1 h-[2px] ${done || active ? 'bg-neutral-900' : 'bg-neutral-200'}`} />}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${
                  done ? 'bg-neutral-900 text-white' : active ? 'bg-neutral-900 text-white ring-4 ring-neutral-100' : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {done ? <Check size={12} /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-[2px] ${done ? 'bg-neutral-900' : 'bg-neutral-200'}`} />}
            </div>
            <span className={`text-[10px] font-medium text-center leading-tight ${active ? 'text-neutral-900' : 'text-neutral-400'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
