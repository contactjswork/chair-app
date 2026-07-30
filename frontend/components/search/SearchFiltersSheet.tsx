'use client';

import { useEffect } from 'react';
import {
  Building2, LayoutGrid, Navigation, RotateCcw, Sparkles, Star, TrendingUp, User, X,
} from 'lucide-react';
import { SPECIALTY_LABELS } from '@/lib/explore';
import type { ExploreCounts, ExploreSort, ExploreType } from '@/lib/explore';
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
  counts: ExploreCounts | null;
  hasLocation: boolean;
  locationLabel: string;
  isLoading: boolean;
}

const SORT_OPTIONS: { label: string; value: ExploreSort; icon: React.ReactNode; needsLocation?: boolean }[] = [
  { label: 'Meilleure correspondance', value: 'relevance', icon: <Sparkles size={13} /> },
  { label: 'Les plus proches',         value: 'distance',  icon: <Navigation size={13} />, needsLocation: true },
  { label: 'Les mieux notés',          value: 'rating',    icon: <Star size={13} /> },
  { label: 'Les plus demandés',        value: 'popular',   icon: <TrendingUp size={13} /> },
];

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

/** Frise à points (diagramme) — utilisée pour la distance et la note minimum,
 *  plus lisible que des chips pour une échelle ordonnée à peu d'étapes. */
function StepTrack({ options, activeIndex, onChange }: {
  options: string[];
  activeIndex: number;
  onChange: (i: number) => void;
}) {
  const n   = options.length - 1;
  const pct = (activeIndex / n) * 100;

  return (
    <div className="px-1">
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-[2px] rounded-full" style={{ background: '#e5e5e5' }} />
        <div
          className="absolute h-[2px] bg-neutral-900 rounded-full transition-all duration-250"
          style={{ width: `${pct}%` }}
        />
        {options.map((_, i) => {
          const past   = i < activeIndex;
          const active = i === activeIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              style={{ left: `${(i / n) * 100}%` }}
              className="absolute -translate-x-1/2 flex items-center justify-center w-8 h-8"
            >
              <span className={`block rounded-full transition-all duration-200 ${
                active
                  ? 'w-5 h-5 bg-neutral-900 ring-[3px] ring-white outline outline-[2px] outline-neutral-900'
                  : past
                  ? 'w-3 h-3 bg-neutral-900'
                  : 'w-3 h-3 bg-neutral-200'
              }`} />
            </button>
          );
        })}
      </div>
      <div className="relative h-6 mt-1">
        {options.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            style={{ left: `${(i / n) * 100}%` }}
            className={`absolute -translate-x-1/2 text-[11px] font-semibold whitespace-nowrap transition-colors ${
              i === activeIndex ? 'text-neutral-900' : 'text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Grande sheet de filtres — les changements s'appliquent en direct, le
 *  compteur du CTA reflète le nombre réel de résultats. Coiffeurs et salons
 *  sont deux façons de chercher, pas deux catégories qui se hiérarchisent —
 *  même poids visuel, "Coiffeurs" en premier (l'app met en avant la personne). */
export default function SearchFiltersSheet({
  open, onClose, filters, onChange, onReset, resultsCount, counts, hasLocation, locationLabel, isLoading,
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

  const typeTabs: { label: string; value: ExploreType; count?: number; icon: React.ReactNode }[] = [
    { label: 'Tous',      value: 'all',         count: counts?.all,          icon: <LayoutGrid size={14} /> },
    { label: 'Coiffeurs', value: 'hairdresser', count: counts?.hairdressers, icon: <User size={14} /> },
    { label: 'Salons',    value: 'salon',       count: counts?.salons,       icon: <Building2 size={14} /> },
  ];

  const radiusIndex = RADIUS_STEPS.findIndex((o) => o.value === filters.radius);
  const ratingIndex = RATING_STEPS.findIndex((o) => o.value === filters.minRating);

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

          {/* Type */}
          <div className="flex bg-neutral-100 rounded-2xl p-1">
            {typeTabs.map((t) => (
              <button
                key={t.value}
                onClick={() => onChange({ type: t.value })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] ${
                  filters.type === t.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                }`}
              >
                {t.icon}
                {t.label}
                {t.count != null && <span className="text-[11px] font-normal text-neutral-400">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Tri */}
          <Section title="Trier par">
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.filter((o) => !o.needsLocation || hasLocation).map((opt) => (
                <Chip key={opt.value} active={filters.sort === opt.value} icon={opt.icon} onClick={() => onChange({ sort: opt.value })}>
                  {opt.label}
                </Chip>
              ))}
            </div>
          </Section>

          {/* Distance — diagramme */}
          <Section
            title="Distance"
            hint={hasLocation ? `Autour de ${locationLabel}` : 'Choisissez une ville ou activez la localisation pour filtrer par distance.'}
          >
            <StepTrack
              options={RADIUS_STEPS.map((o) => o.label)}
              activeIndex={radiusIndex < 0 ? RADIUS_STEPS.length - 1 : radiusIndex}
              onChange={(i) => onChange({ radius: RADIUS_STEPS[i].value })}
            />
          </Section>

          {/* Spécialités */}
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

          {/* Note minimum — diagramme */}
          <Section title="Note minimum">
            <StepTrack
              options={RATING_STEPS.map((o) => o.label)}
              activeIndex={ratingIndex < 0 ? 0 : ratingIndex}
              onChange={(i) => onChange({ minRating: RATING_STEPS[i].value })}
            />
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
