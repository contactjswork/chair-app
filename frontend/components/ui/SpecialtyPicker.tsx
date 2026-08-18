'use client';

import Image from 'next/image';
import { Check, Scissors, UserRound, Wind, Paintbrush, Minus, CircleDot, Star, Layers, Heart, Wand2, Sparkles } from 'lucide-react';
import type { ApiSpecialty } from '@/lib/types';

/**
 * Illustrations réelles — mêmes fichiers que côté client (SpecialtyQuickLinks
 * sur la home, compte/modifier, onboarding client) : retour direct de Julien,
 * la sélection de spécialités côté PRO doit ressembler à celle de CHAIR
 * normal, pas afficher des icônes vectorielles génériques différentes.
 * Priorité : illustration ci-dessous > s.icon (emoji en base) > icône
 * vectorielle de repli > Sparkles générique — jamais un carré vide.
 */
const SPECIALTY_ILLUSTRATIONS: Record<string, string> = {
  'couleur-balayage':     '/onboarding/balayage.png',
  'coupe-femme':          '/onboarding/coupe.png',
  'boucles-curly':        '/onboarding/boucles.png',
  'texture-lissage':      '/onboarding/lissage.png',
  'coloration':           '/onboarding/couleur-femme.png',
  'chignon':              '/onboarding/chignon.png',
  'barber':               '/onboarding/barber.png',
  'coupe-homme':          '/onboarding/classique.png',
  'coupe-longue':         '/onboarding/cheveux-longs.png',
  'barbe':                '/onboarding/barbe.png',
  'couleur-homme':        '/onboarding/couleur.png',
  'afro-locks':           '/onboarding/dreads.png',
  'soins-transformation': '/onboarding/couleur.png',
  'evenementiel':         '/onboarding/chignon.png',
  'extensions':           '/onboarding/cheveux-longs.png',
};

// Icônes de repli pour les spécialités qui n'ont pas (encore) d'illustration
// dédiée — dès qu'un slug a une icon renseignée en base, elle prend le
// dessus sur ce repli vectoriel, aucun changement de code requis.
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
  const boxSize = size === 'sm' ? 'w-12 h-12' : 'w-14 h-14';
  const illustrationPx = size === 'sm' ? 34 : 40;
  const iconSize = size === 'sm' ? 18 : 22;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {specialties.map((s) => {
        const active = selected.includes(s.id);
        const illustration = SPECIALTY_ILLUSTRATIONS[s.slug];
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
              {illustration ? (
                <Image
                  src={illustration}
                  alt={s.name}
                  width={illustrationPx}
                  height={illustrationPx}
                  // mix-blend-multiply : mêmes illustrations fond blanc que
                  // SpecialtyQuickLinks — sur le fond blanc de repos ça se
                  // fond naturellement ; sur le fond noir sélectionné (bg-
                  // white/10) le blend n'apporte rien mais ne casse rien non
                  // plus (le PNG a un fond blanc transparent).
                  className={`object-contain ${active ? '' : 'mix-blend-multiply'}`}
                  style={{ width: illustrationPx, height: illustrationPx }}
                />
              ) : s.icon ? (
                <span style={{ fontSize: iconSize }} className="leading-none">{s.icon}</span>
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
