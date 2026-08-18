'use client';

import Image from 'next/image';
import { Check, Scissors, UserRound, Wind, Paintbrush, Minus, CircleDot, Star, Layers, Heart, Wand2, Sparkles } from 'lucide-react';
import type { ApiSpecialty } from '@/lib/types';
import { SPECIALTY_ILLUSTRATIONS, HOMME_SPECIALTY_SLUGS, FEMME_SPECIALTY_SLUGS } from '@/lib/specialties';

// Icônes de repli pour les spécialités qui n'ont ni vraie photo (image_url)
// ni illustration locale ni emoji en base — dernier recours avant Sparkles.
const SPECIALTY_ICONS: Record<string, React.ElementType> = {
  'coupe-homme':          Scissors,
  'barbe':                UserRound,
  'coupe-femme':          Wind,
  'couleur-balayage':     Paintbrush,
  'texture-lissage':      Minus,
  'boucles-curly':        CircleDot,
  'afro-locks':           Star,
  'extensions':           Layers,
  'evenementiel':         Heart,
  'soins-transformation': Wand2,
};

interface Props {
  specialties: ApiSpecialty[];
  selected: number[];
  onToggle: (id: number) => void;
  size?: 'sm' | 'md';
}

/**
 * Regroupe la liste plate reçue de l'API en 2 sections Femme/Homme, dans
 * l'ordre canonique de FEMME_SPECIALTY_SLUGS/HOMME_SPECIALTY_SLUGS (lib/
 * specialties.ts — seule source de vérité de la répartition par genre,
 * décidée avec Julien). Toute spécialité future non encore classée y
 * atterrit quand même (section "Autres"), jamais silencieusement cachée.
 */
function groupByGender(specialties: ApiSpecialty[]) {
  const bySlug = new Map(specialties.map((s) => [s.slug, s]));
  const femme = FEMME_SPECIALTY_SLUGS.map((slug) => bySlug.get(slug)).filter((s): s is ApiSpecialty => Boolean(s));
  const homme = HOMME_SPECIALTY_SLUGS.map((slug) => bySlug.get(slug)).filter((s): s is ApiSpecialty => Boolean(s));
  const classified = new Set([...femme, ...homme].map((s) => s.id));
  const autres = specialties.filter((s) => !classified.has(s.id));
  return { femme, homme, autres };
}

export default function SpecialtyPicker({ specialties, selected, onToggle, size = 'md' }: Props) {
  const { femme, homme, autres } = groupByGender(specialties);

  return (
    <div className="flex flex-col gap-5">
      {femme.length > 0 && <SpecialtyGroup label="Femme" items={femme} selected={selected} onToggle={onToggle} size={size} />}
      {homme.length > 0 && <SpecialtyGroup label="Homme" items={homme} selected={selected} onToggle={onToggle} size={size} />}
      {autres.length > 0 && <SpecialtyGroup label="Autres" items={autres} selected={selected} onToggle={onToggle} size={size} />}
    </div>
  );
}

function SpecialtyGroup({ label, items, selected, onToggle, size }: { label: string; items: ApiSpecialty[]; selected: number[]; onToggle: (id: number) => void; size: 'sm' | 'md' }) {
  const boxSize = size === 'sm' ? 'w-12 h-12' : 'w-14 h-14';
  const illustrationPx = size === 'sm' ? 34 : 40;
  const iconSize = size === 'sm' ? 18 : 22;

  return (
    <div>
      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide mb-2.5">{label}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {items.map((s) => {
          const active = selected.includes(s.id);
          // Priorité : image_url (vraie photo, administrable sans build) >
          // illustration locale de repli > emoji en base > icône vectorielle
          // > Sparkles générique — jamais un carré vide.
          const photo = s.image_url;
          const illustration = SPECIALTY_ILLUSTRATIONS[s.slug];
          const Icon = SPECIALTY_ICONS[s.slug] ?? Sparkles;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border-2 transition-all ${
                active
                  ? 'border-neutral-900 shadow-[0_6px_18px_-6px_rgba(10,10,10,0.2)]'
                  : 'border-transparent shadow-[0_2px_10px_-4px_rgba(10,10,10,0.1)] hover:border-neutral-200'
              }`}
            >
              <div className={`relative ${boxSize} rounded-[16px] flex items-center justify-center overflow-hidden flex-shrink-0 bg-neutral-100`}>
                {photo ? (
                  // Vraie photo (Cloudinary) : plein cadre, pas de blend — le
                  // mix-blend-multiply ci-dessous est pensé pour les
                  // illustrations fond blanc, il assombrirait une photo réelle.
                  <Image src={photo} alt={s.name} fill sizes={`${illustrationPx}px`} className="object-cover" />
                ) : illustration ? (
                  <Image
                    src={illustration}
                    alt={s.name}
                    width={illustrationPx}
                    height={illustrationPx}
                    className="object-contain mix-blend-multiply"
                    style={{ width: illustrationPx, height: illustrationPx }}
                  />
                ) : s.icon ? (
                  <span style={{ fontSize: iconSize }} className="leading-none">{s.icon}</span>
                ) : (
                  <Icon size={iconSize} className="text-neutral-500" strokeWidth={1.5} />
                )}
              </div>
              <span className={`text-[11px] font-semibold text-center leading-tight ${active ? 'text-neutral-900' : 'text-neutral-600'}`}>
                {s.name}
              </span>
              {active && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-neutral-900 flex items-center justify-center">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
