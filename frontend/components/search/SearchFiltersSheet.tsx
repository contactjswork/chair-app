'use client';

import { useEffect } from 'react';
import { MapPin, RotateCcw, Star, X } from 'lucide-react';
import { SPECIALTY_LABELS } from '@/lib/explore';
import type { ExploreSort, ExploreType } from '@/lib/explore';
import { getSpecialtyIcon } from './specialtyIcons';
import { FilterChip } from '@/components/ui/Badge';
import { PrimaryButton, SecondaryButton, IconButton } from '@/components/ui/Button';

export interface FiltersState {
  type: ExploreType;
  sort: ExploreSort;
  minRating: number;
  radius: number | null;
  specialties: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  filters: FiltersState;
  onChange: (patch: Partial<FiltersState>) => void;
  onReset: () => void;
  resultsCount: number;
  hasLocation: boolean;
  locationLabel: string;
  isLoading: boolean;
}

const RATING_STEPS = [
  { label: 'Toutes', value: 0   },
  { label: '4+',     value: 4   },
  { label: '4,5+',   value: 4.5 },
];

const RADIUS_STEPS = [
  { label: '5 km',  value: 5   },
  { label: '10 km', value: 10  },
  { label: '20 km', value: 20  },
  { label: '50 km', value: 50  },
  { label: 'France', value: null },
];

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 mb-3">{title}</p>
      {children}
      {hint && <p className="text-[11px] text-neutral-400 mt-2.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

/** Chip de la sheet — délègue au FilterChip partagé pour que le tri et les
 *  spécialités aient exactement le même gabarit que les chips de la liste
 *  (avant : 4 styles de chip différents rien que dans l'écran Recherche). */
function Chip({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <FilterChip active={active} onClick={onClick}>
      {icon && <span className={active ? 'text-white' : 'text-neutral-400'}>{icon}</span>}
      {children}
    </FilterChip>
  );
}

/** Sheet de filtres minimale — volontairement réduite à ce qui compte pour
 *  trouver un coiffeur (spécialité / distance / note). Le tri (déjà
 *  "meilleure correspondance" par défaut, le plus utile) et le type
 *  coiffeurs/salons (déjà disponible juste au-dessus de la liste) ne sont PAS
 *  dupliqués ici — une seule surface pour chaque réglage, pas deux. */
export default function SearchFiltersSheet({
  open, onClose, filters, onChange, onReset, resultsCount, hasLocation, locationLabel, isLoading,
}: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex flex-col justify-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />

      <div className="relative flex flex-col bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] md:max-h-[85vh] md:w-full md:max-w-lg overflow-hidden">
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 flex-shrink-0">
          <h2 className="text-[17px] font-bold text-neutral-900 tracking-[-0.01em]">Filtres</h2>
          <IconButton onClick={onClose} aria-label="Fermer" size="sm">
            <X size={15} />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-8">

          {/* Spécialités — le "quoi", premier réglage rencontré */}
          <Section title="Spécialités">
            <div className="flex flex-wrap gap-2">
              {Object.entries(SPECIALTY_LABELS).map(([slug, label]) => {
                const active = filters.specialties.includes(slug);
                return (
                  <Chip
                    key={slug}
                    active={active}
                    icon={getSpecialtyIcon(slug, 13)}
                    onClick={() => onChange({
                      specialties: active
                        ? filters.specialties.filter((s) => s !== slug)
                        : [...filters.specialties, slug],
                    })}
                  >
                    {label}
                  </Chip>
                );
              })}
            </div>
          </Section>

          {/* Distance — le "où", chips simples plutôt qu'un diagramme à points */}
          <Section
            title="Distance"
            hint={hasLocation ? `Autour de ${locationLabel}` : 'Choisissez une ville ou activez la localisation pour filtrer par distance.'}
          >
            <div className="flex flex-wrap gap-2">
              {RADIUS_STEPS.map((opt) => (
                <Chip
                  key={String(opt.value)}
                  active={filters.radius === opt.value}
                  icon={opt.value === null ? undefined : <MapPin size={13} />}
                  onClick={() => onChange({ radius: opt.value })}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </Section>

          {/* Note minimum — même gabarit de chips que Distance */}
          <Section title="Note minimum">
            <div className="flex flex-wrap gap-2">
              {RATING_STEPS.map((opt) => (
                <Chip
                  key={String(opt.value)}
                  active={filters.minRating === opt.value}
                  icon={opt.value > 0 ? <Star size={13} /> : undefined}
                  onClick={() => onChange({ minRating: opt.value })}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </Section>
        </div>

        {/* Actions sticky */}
        <div className="flex-shrink-0 border-t border-neutral-100 px-5 py-4 pb-safe flex gap-2.5 bg-white">
          <SecondaryButton onClick={onReset} icon={<RotateCcw size={13} />}>
            Effacer
          </SecondaryButton>
          <PrimaryButton onClick={onClose} fullWidth loading={isLoading}>
            {isLoading ? 'Recherche…' : `Afficher ${resultsCount} résultat${resultsCount > 1 ? 's' : ''}`}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
