'use client';

import { Check, Scissors, UserRound, Wind, Paintbrush, Minus, CircleDot, Star, Layers, Heart, Wand2, Sparkles } from 'lucide-react';
import type { ApiSpecialty } from '@/lib/types';

// Icônes de repli tant que Julien n'a pas fourni les vraies images par
// spécialité (specialties.icon) — dès qu'un slug a une icon renseignée en
// base, elle prend le dessus automatiquement, aucun changement de code requis.
export const SPECIALTY_ICONS: Record<string, React.ElementType> = {
  'coupe-homme':         Scissors,
  'barbe':               UserRound,
  'coupe-femme':         Wind,
  'couleur-balayage':    Paintbrush,
  'texture-lissage':     Minus,
  'boucles-curly':       CircleDot,
  'afro-locks':          Star,
  'extensions':          Layers,
  'evenementiel':        Heart,
  'soins-transformation':Wand2,
};

interface Props {
  specialties: ApiSpecialty[];
  selected: number[];
  onToggle: (id: number) => void;
  size?: 'sm' | 'md';
}

export default function SpecialtyPicker({ specialties, selected, onToggle, size = 'md' }: Props) {
  const boxSize = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  const iconSize = size === 'sm' ? 18 : 22;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {specialties.map((s) => {
        const active = selected.includes(s.id);
        const Icon = SPECIALTY_ICONS[s.slug] ?? Sparkles;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onToggle(s.id)}
            className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
              active ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-200 bg-white hover:border-neutral-400'
            }`}
          >
            <div className={`relative ${boxSize} rounded-[16px] flex items-center justify-center overflow-hidden flex-shrink-0 ${active ? 'bg-white/10' : 'bg-neutral-100'}`}>
              {s.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.icon} alt={s.name} className="w-full h-full object-cover" />
              ) : (
                <Icon size={iconSize} className={active ? 'text-white' : 'text-neutral-500'} strokeWidth={1.5} />
              )}
            </div>
            <span className={`text-[11px] font-semibold text-center leading-tight ${active ? 'text-white' : 'text-neutral-700'}`}>
              {s.name}
            </span>
            {active && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                <Check size={10} className="text-neutral-900" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
