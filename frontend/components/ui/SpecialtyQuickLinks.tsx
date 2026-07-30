'use client';

import Image from 'next/image';
import Link from 'next/link';

// Toutes les spécialités CHAIR — navigation brute, jamais filtrée par genre
// ou préférences (contrairement à "Pour vous" juste en dessous) : c'est le
// point d'entrée pour parcourir toute l'offre, pas une sélection personnalisée.
const SPECIALTIES = [
  { slug: 'couleur-balayage',     label: 'Couleur & Balayage',    icon: '/onboarding/balayage.png' },
  { slug: 'coupe-femme',          label: 'Coupe Femme',            icon: '/onboarding/coupe.png' },
  { slug: 'boucles-curly',        label: 'Boucles & Curly',        icon: '/onboarding/boucles.png' },
  { slug: 'texture-lissage',      label: 'Texture & Lissage',      icon: '/onboarding/lissage.png' },
  { slug: 'soins-transformation', label: 'Soins & Transformation', icon: '/onboarding/couleur.png' },
  { slug: 'evenementiel',         label: 'Événementiel',           icon: '/onboarding/chignon.png' },
  { slug: 'coupe-homme',          label: 'Coupe Homme',            icon: '/onboarding/classique.png' },
  { slug: 'extensions',           label: 'Extensions',             icon: '/onboarding/cheveux-longs.png' },
  { slug: 'barbe',                label: 'Barbe',                  icon: '/onboarding/barbe.png' },
  { slug: 'afro-locks',           label: 'Afro & Locks',           icon: '/onboarding/dreads.png' },
];

export default function SpecialtyQuickLinks() {
  return (
    <section className="pt-2 pb-1">
      <div className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-2 no-scrollbar">
        {SPECIALTIES.map((s) => (
          <Link
            key={s.slug}
            href={`/app/recherche?specialty=${s.slug}`}
            className="flex-shrink-0 flex flex-col items-center gap-2 w-[72px] active:scale-[0.88] transition-transform duration-150"
          >
            <div className="w-[76px] h-[76px] rounded-[20px] border-2 border-neutral-900 flex items-center justify-center bg-white">
              <Image
                src={s.icon}
                alt={s.label}
                width={54}
                height={54}
                className="object-contain mix-blend-multiply"
              />
            </div>
            <p className="text-[11px] font-semibold text-neutral-700 text-center leading-tight">{s.label}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
