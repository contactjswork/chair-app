'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, RotateCcw, Star, X } from 'lucide-react';
import { SPECIALTY_LABELS } from '@/lib/explore';
import type { ExploreSort, ExploreType } from '@/lib/explore';
import { SPECIALTY_ILLUSTRATIONS, getLiveSpecialtyImages, getLiveSpecialtyLabels } from '@/lib/specialties';
import { getSpecialtyIcon } from './specialtyIcons';
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

// Paliers des deux sliders — des valeurs RONDES uniquement (pas de continu,
// "17 km" n'aide personne). Le contrat du hook est inchangé : radius en km
// (null = pas de filtre distance), minRating en nombre envoyé tel quel en
// min_rating (0 = pas de filtre).
const DISTANCE_STEPS: { label: string; value: number | null; valueText: string }[] = [
  { label: '5',       value: 5,    valueText: '5 km'   },
  { label: '10',      value: 10,   valueText: '10 km'  },
  { label: '25',      value: 25,   valueText: '25 km'  },
  { label: '50',      value: 50,   valueText: '50 km'  },
  { label: '100',     value: 100,  valueText: '100 km' },
  { label: 'Partout', value: null, valueText: 'Partout' },
];

const RATING_STEPS: { label: string; value: number; valueText: string }[] = [
  { label: 'Toutes', value: 0,   valueText: 'Toutes les notes'    },
  { label: '3+',     value: 3,   valueText: 'Au moins 3 étoiles'   },
  { label: '4+',     value: 4,   valueText: 'Au moins 4 étoiles'   },
  { label: '4,5+',   value: 4.5, valueText: 'Au moins 4,5 étoiles' },
];

/** Index du palier le plus proche de la valeur courante — les valeurs
 *  peuvent venir d'ailleurs que du slider (défaut radius=20, deep-link) :
 *  on positionne alors le curseur sur le palier le plus proche sans
 *  modifier la valeur tant que l'utilisateur n'a pas touché le slider. */
function nearestStepIndex(steps: { value: number | null }[], value: number | null): number {
  if (value == null) {
    const i = steps.findIndex((s) => s.value == null);
    return i >= 0 ? i : steps.length - 1;
  }
  let best = 0;
  let bestDiff = Infinity;
  steps.forEach((s, i) => {
    if (s.value == null) return;
    const d = Math.abs(s.value - value);
    if (d < bestDiff) { bestDiff = d; best = i; }
  });
  return best;
}

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 mb-3">{title}</p>
      {children}
      {hint && <p className="text-[11px] text-neutral-400 mt-2.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

/** Slider à paliers commun à Distance et Note — même rail, même curseur,
 *  même gabarit de libellés : un seul langage visuel pour les deux réglages.
 *  <input type="range"> natif (focusable, flèches clavier, aria-valuetext),
 *  stylé via .chair-range (globals.css), snap garanti par step={1} sur des
 *  index entiers. */
function SnapSlider({ steps, index, onIndexChange, ariaLabel }: {
  steps: { label: string; valueText: string }[];
  index: number;
  onIndexChange: (i: number) => void;
  ariaLabel: string;
}) {
  const max = steps.length - 1;
  const pct = max > 0 ? (index / max) * 100 : 0;
  return (
    <div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={index}
        onChange={(e) => onIndexChange(Number(e.target.value))}
        className="chair-range"
        aria-label={ariaLabel}
        aria-valuetext={steps[index]?.valueText}
        style={{ '--chair-range-track': `linear-gradient(to right, #171717 0%, #171717 ${pct}%, #e5e5e5 ${pct}%, #e5e5e5 100%)` } as React.CSSProperties}
      />
      {/* Libellés des paliers — tappables (raccourci), mais cachés des
          lecteurs d'écran : le range ci-dessus est LE contrôle accessible. */}
      <div className="flex justify-between" aria-hidden="true">
        {steps.map((s, i) => (
          <button
            key={s.label}
            type="button"
            tabIndex={-1}
            onClick={() => onIndexChange(i)}
            className={`text-[11px] font-semibold px-1 pb-1 pt-0.5 transition-colors ${i === index ? 'text-neutral-900' : 'text-neutral-400'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Vignette spécialité — même chaîne de priorité photo que partout dans
 *  l'app (vraie photo Cloudinary > illustration locale /onboarding >
 *  icône vectorielle, jamais un carré vide) : voir SpecialtyThumb du
 *  portfolio PRO et SpecialtyQuickLinks de la home. */
function SpecialtyTile({ slug, label, imageUrl, active, onToggle }: {
  slug: string; label: string; imageUrl?: string; active: boolean; onToggle: () => void;
}) {
  const illustration = SPECIALTY_ILLUSTRATIONS[slug];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className="flex flex-col items-center gap-1.5 min-w-0 pt-1 pb-0.5 active:scale-[0.94] transition-transform"
    >
      <span
        className={`relative w-[54px] h-[54px] rounded-2xl overflow-hidden bg-neutral-50 flex items-center justify-center flex-shrink-0 transition-shadow ${
          active
            ? 'ring-[2.5px] ring-neutral-900 ring-offset-2 ring-offset-white'
            : 'ring-1 ring-neutral-200'
        }`}
      >
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes="54px" className="object-cover" />
        ) : illustration ? (
          <Image src={illustration} alt="" width={44} height={44} className="object-contain mix-blend-multiply" />
        ) : (
          <span className="text-neutral-400">{getSpecialtyIcon(slug, 20)}</span>
        )}
        {active && (
          <span className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-neutral-900 flex items-center justify-center shadow-sm">
            <Check size={11} strokeWidth={3.5} className="text-white" />
          </span>
        )}
      </span>
      <span className={`text-[10.5px] leading-tight text-center line-clamp-2 ${active ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-500'}`}>
        {label}
      </span>
    </button>
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
  // Libellés live (DB, administrables sans build) — repli sur SPECIALTY_LABELS
  // tant que le fetch n'a pas résolu / si l'API tombe. Idem pour les vraies
  // photos ({} tant qu'aucune spécialité n'a de photo en base).
  const [liveLabels, setLiveLabels] = useState<Record<string, string>>(SPECIALTY_LABELS);
  const [liveImages, setLiveImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    getLiveSpecialtyLabels().then((map) => { if (!cancelled) setLiveLabels(map); });
    getLiveSpecialtyImages().then((map) => { if (!cancelled) setLiveImages(map); });
    return () => { cancelled = true; };
  }, []);

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

  const distanceIdx = nearestStepIndex(DISTANCE_STEPS, filters.radius);
  const ratingIdx   = nearestStepIndex(RATING_STEPS, filters.minRating);
  const ratingStep  = RATING_STEPS[ratingIdx];

  return (
    <div className="fixed inset-0 z-[85] flex flex-col justify-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-neutral-900/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Retour Julien : le trait de poignée en haut faisait "moche" — retiré.
          Coins très arrondis + ombre plutôt qu'un bord dur, même langage que
          le reste de la home (RecommendationCard, pastilles spécialités). */}
      <div className="relative flex flex-col bg-white rounded-t-[32px] md:rounded-[32px] shadow-[0_-8px_40px_-8px_rgba(10,10,10,0.25)] md:shadow-[0_24px_60px_-12px_rgba(10,10,10,0.3)] max-h-[92vh] md:max-h-[85vh] md:w-full md:max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-[20px] font-bold text-neutral-900 tracking-[-0.02em]">Filtres</h2>
          <IconButton onClick={onClose} aria-label="Fermer" size="sm">
            <X size={15} />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 space-y-7">

          {/* Spécialités — le "quoi", premier réglage rencontré. Vignettes
              photo compactes multi-sélection, état sélectionné marqué par un
              ring noir épais + coche (jamais juste une opacité). */}
          <Section title="Spécialités">
            <div className="grid grid-cols-3 gap-x-2 gap-y-3">
              {Object.entries(liveLabels).map(([slug, label]) => {
                const active = filters.specialties.includes(slug);
                return (
                  <SpecialtyTile
                    key={slug}
                    slug={slug}
                    label={label}
                    imageUrl={liveImages[slug]}
                    active={active}
                    onToggle={() => onChange({
                      specialties: active
                        ? filters.specialties.filter((s) => s !== slug)
                        : [...filters.specialties, slug],
                    })}
                  />
                );
              })}
            </div>
          </Section>

          {/* Distance — le "où", slider à paliers ronds + position Partout */}
          <Section
            title="Distance"
            hint={hasLocation ? `Autour de ${locationLabel}` : 'Choisissez une ville ou activez la localisation pour filtrer par distance.'}
          >
            <p className="text-[22px] font-bold text-neutral-900 tracking-[-0.02em] leading-none mb-1">
              {filters.radius == null ? 'Partout' : `${filters.radius} km`}
            </p>
            <SnapSlider
              steps={DISTANCE_STEPS}
              index={distanceIdx}
              onIndexChange={(i) => onChange({ radius: DISTANCE_STEPS[i].value })}
              ariaLabel="Distance maximale"
            />
          </Section>

          {/* Note minimum — même rail, même curseur que Distance */}
          <Section title="Note minimum">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-[22px] font-bold text-neutral-900 tracking-[-0.02em] leading-none">
                {ratingStep.value === 0 ? 'Toutes' : ratingStep.label}
              </p>
              {ratingStep.value > 0 && <Star size={16} className="text-neutral-900 fill-neutral-900" />}
            </div>
            <SnapSlider
              steps={RATING_STEPS}
              index={ratingIdx}
              onIndexChange={(i) => onChange({ minRating: RATING_STEPS[i].value })}
              ariaLabel="Note minimum"
            />
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {ratingStep.value === 0 ? 'Tous les profils, quelle que soit la note.' : `${ratingStep.valueText}.`}
            </p>
          </Section>
        </div>

        {/* Actions — ombre plutôt que trait dur pour séparer du contenu qui scroll */}
        <div className="flex-shrink-0 shadow-[0_-8px_20px_-12px_rgba(10,10,10,0.15)] px-6 pt-5 pb-safe-5 flex gap-2.5 bg-white">
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
