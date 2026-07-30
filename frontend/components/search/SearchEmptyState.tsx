'use client';

import { RotateCcw, SearchX, WifiOff } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { PrimaryButton, GhostButton } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/Badge';

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

/**
 * État "aucun résultat" / "erreur réseau" — propose toujours une sortie.
 * Structure icône/titre/sous-texte reprise de EmptyState partagé, et les
 * élargissements de rayon sont regroupés sur une seule rangée de chips :
 * trois boutons pleine largeur empilés donnaient un mur d'actions de même
 * poids alors qu'il s'agit d'un seul réglage à trois valeurs.
 */
export default function SearchEmptyState({
  variant, message, radius, hasActiveFilters, onWidenRadius, onClearSpecialties, onReset, onRetry,
}: Props) {
  const widenSteps: { label: string; value: number | null }[] = [];
  if (variant === 'empty' && radius != null) {
    if (radius < 20) widenSteps.push({ label: '20 km', value: 20 });
    if (radius < 50) widenSteps.push({ label: '50 km', value: 50 });
    widenSteps.push({ label: 'Toute la France', value: null });
  }

  return (
    <EmptyState
      icon={variant === 'error' ? WifiOff : SearchX}
      title={variant === 'error' ? 'Connexion impossible' : 'Aucun résultat'}
      subtitle={message}
      compact
      action={
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          {variant === 'error' && onRetry && (
            <PrimaryButton onClick={onRetry} fullWidth>Réessayer</PrimaryButton>
          )}

          {widenSteps.length > 0 && (
            <div className="w-full">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-2.5">
                Élargir la zone
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {widenSteps.map((s) => (
                  <FilterChip key={s.label} onClick={() => onWidenRadius(s.value)}>
                    {s.label}
                  </FilterChip>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center">
            {variant === 'empty' && onClearSpecialties && (
              <GhostButton size="sm" onClick={onClearSpecialties}>Retirer les spécialités</GhostButton>
            )}
            {hasActiveFilters && (
              <GhostButton size="sm" onClick={onReset} icon={<RotateCcw size={12} />}>
                Réinitialiser les filtres
              </GhostButton>
            )}
          </div>
        </div>
      }
    />
  );
}
