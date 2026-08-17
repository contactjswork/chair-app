'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getUserSpecialtySlugs } from '@/lib/homeFilters';

// Toutes les spécialités CHAIR — la personnalisation ne fait que RÉORDONNER
// ce même jeu de catégories (jamais en inventer, jamais en cacher pour de
// bon) : les 4 à 6 en tête correspondent aux préférences réelles de
// l'utilisateur (onboarding ou repli genre), le reste reste accessible d'un
// tap sur "Voir tout".
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

const PRIORITY_COUNT = 6;

export default function SpecialtyQuickLinks() {
  // État initial déterministe (ordre déclaré ci-dessus) — évite tout écart
  // SSR/client ; la réordonnance selon les préférences arrive juste après le
  // montage, une fois le localStorage lisible (même pattern que les autres
  // strips de la home, voir HomeGeoStrips.tsx).
  const [visible, setVisible] = useState(SPECIALTIES.slice(0, PRIORITY_COUNT));
  const [rest, setRest] = useState(SPECIALTIES.slice(PRIORITY_COUNT));

  useEffect(() => {
    // getUserSpecialtySlugs() ne renvoie jamais [] (repli DEFAULT_SLUGS en
    // dernier recours) — mais si aucune de ces catégories ne recoupe ce jeu
    // de 10 icônes (ex. préférence très granulaire de l'onboarding sans
    // équivalent ici), `matched` reste vide et l'ordre par défaut est gardé
    // tel quel, sans faux réordonnancement.
    const preferred = getUserSpecialtySlugs();
    const matched = preferred
      .map((slug) => SPECIALTIES.find((s) => s.slug === slug))
      .filter((s): s is (typeof SPECIALTIES)[number] => Boolean(s));
    if (matched.length === 0) return;

    // Priorité stricte : catégories réellement choisies (ou repli genre)
    // d'abord, dans l'ordre où l'utilisateur les a sélectionnées, puis le
    // reste des catégories CHAIR pour compléter jusqu'à PRIORITY_COUNT —
    // jamais une rangée à moitié vide juste parce que l'utilisateur n'a
    // choisi qu'un ou deux styles.
    const matchedSlugs = new Set(matched.map((s) => s.slug));
    const filler = SPECIALTIES.filter((s) => !matchedSlugs.has(s.slug));
    const ordered = [...matched, ...filler];

    // Lecture localStorage impossible côté serveur — ce réordonnancement ne
    // peut arriver qu'après montage, une seule fois (deps []), même pattern
    // que les autres strips de la home (voir HomePersonalized.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(ordered.slice(0, PRIORITY_COUNT));
    setRest(ordered.slice(PRIORITY_COUNT));
  }, []);

  return (
    <section className="pt-2 pb-1">
      <div className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-2 no-scrollbar">
        {visible.map((s) => (
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

        {rest.length > 0 && (
          <Link
            href="/app/recherche"
            className="flex-shrink-0 flex flex-col items-center gap-2 w-[72px] active:scale-[0.88] transition-transform duration-150"
          >
            <div className="w-[76px] h-[76px] rounded-[20px] border-2 border-dashed border-neutral-300 flex items-center justify-center bg-white">
              <ChevronRight size={20} className="text-neutral-400" strokeWidth={2.5} />
            </div>
            <p className="text-[11px] font-semibold text-neutral-500 text-center leading-tight">Voir tout</p>
          </Link>
        )}
      </div>
    </section>
  );
}
