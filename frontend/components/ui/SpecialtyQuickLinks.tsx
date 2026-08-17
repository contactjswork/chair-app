'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { FEMME_SLUGS, HOMME_SLUGS, getUserPrefs, getUserSpecialtySlugs } from '@/lib/homeFilters';
import { getLiveSpecialtyLabels } from '@/lib/specialties';
import Reveal from './Reveal';

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

const DEFAULT_PRIORITY_COUNT = 6;

export default function SpecialtyQuickLinks({ limit }: { limit?: number } = {}) {
  const priorityCount = limit && limit > 0 ? Math.min(limit, SPECIALTIES.length) : DEFAULT_PRIORITY_COUNT;

  // État initial déterministe (ordre déclaré ci-dessus) — évite tout écart
  // SSR/client ; la réordonnance selon les préférences arrive juste après le
  // montage, une fois le localStorage lisible (même pattern que les autres
  // strips de la home, voir HomeGeoStrips.tsx).
  const [visible, setVisible] = useState(SPECIALTIES.slice(0, priorityCount));
  const [rest, setRest] = useState(SPECIALTIES.slice(priorityCount));
  // Libellés live (DB, administrables sans build) — repli sur le libellé codé
  // en dur de SPECIALTIES tant que le fetch n'a pas résolu / si l'API tombe.
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    getLiveSpecialtyLabels().then((map) => { if (!cancelled) setLabels(map); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // getUserSpecialtySlugs() ne renvoie jamais [] (repli DEFAULT_SLUGS en
    // dernier recours) — mais si aucune de ces catégories ne recoupe ce jeu
    // de 10 icônes (ex. préférence très granulaire de l'onboarding sans
    // équivalent ici), `matched` reste vide et l'ordre par défaut est gardé
    // tel quel, sans faux réordonnancement.
    const { gender } = getUserPrefs();
    const preferred = getUserSpecialtySlugs();
    const matched = preferred
      .map((slug) => SPECIALTIES.find((s) => s.slug === slug))
      .filter((s): s is (typeof SPECIALTIES)[number] => Boolean(s));
    if (matched.length === 0) return;

    // Priorité stricte : catégories réellement choisies d'abord, dans l'ordre
    // où l'utilisateur les a sélectionnées, puis complète jusqu'à
    // PRIORITY_COUNT — jamais une rangée à moitié vide juste parce que
    // l'utilisateur n'a choisi qu'un ou deux styles. Le complément ne pioche
    // JAMAIS dans les catégories de l'autre genre (un homme qui a choisi
    // Coupe Homme + Barbe ne doit pas voir Coupe Femme apparaître pour
    // remplir les cases vides) — seules les vraies catégories choisies
    // peuvent traverser le genre, jamais le remplissage automatique.
    const matchedSlugs = new Set(matched.map((s) => s.slug));
    const genderPool = gender === 'homme' ? HOMME_SLUGS : gender === 'femme' ? FEMME_SLUGS : null;
    const fillerCandidates = genderPool ? SPECIALTIES.filter((s) => genderPool.includes(s.slug)) : SPECIALTIES;
    const filler = fillerCandidates.filter((s) => !matchedSlugs.has(s.slug));
    const visibleOrdered = [...matched, ...filler].slice(0, priorityCount);

    // "Voir tout" reste un vrai accès à TOUTES les catégories CHAIR (pas
    // seulement celles du genre) — restreindre les 6 mises en avant ne doit
    // jamais restreindre ce qui reste découvrable derrière.
    const visibleSlugs = new Set(visibleOrdered.map((s) => s.slug));
    const restOrdered = SPECIALTIES.filter((s) => !visibleSlugs.has(s.slug));

    // Lecture localStorage impossible côté serveur — ce réordonnancement ne
    // peut arriver qu'après montage, une seule fois par valeur de
    // priorityCount (venue de la config home, stable en pratique), même
    // pattern que les autres strips de la home (voir HomePersonalized.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(visibleOrdered);
    setRest(restOrdered);
  }, [priorityCount]);

  return (
    // pt-6 (au lieu de pt-2) : la rangée respirait à peine sous "Pour vous" —
    // reste plus tassée qu'une section titrée (c'est un simple raccourci de
    // filtre, pas un bloc de contenu), mais assez d'air pour ne plus coller.
    <section className="pt-6 pb-2">
      <div className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-2 no-scrollbar">
        {visible.map((s, i) => (
          <Reveal key={s.slug} delay={(i % 6) * 45} className="flex-shrink-0">
            <Link
              href={`/app/recherche?specialty=${s.slug}`}
              className="group flex flex-col items-center gap-2 w-[72px] active:scale-[0.94] transition-transform duration-150"
            >
              <div className="w-[76px] h-[76px] rounded-[20px] border-2 border-neutral-900 flex items-center justify-center bg-white transition-colors group-hover:bg-neutral-50">
                <Image
                  src={s.icon}
                  alt={labels[s.slug] ?? s.label}
                  width={54}
                  height={54}
                  className="object-contain mix-blend-multiply"
                />
              </div>
              <p className="text-[11px] font-semibold text-neutral-700 text-center leading-tight">{labels[s.slug] ?? s.label}</p>
            </Link>
          </Reveal>
        ))}

        {rest.length > 0 && (
          <Link
            href="/app/recherche"
            // Scale harmonisé avec les pastilles voisines (0.94) — rien ne
            // justifiait que "Voir tout" réagisse plus fort (0.88) au tap
            // que les catégories juste à côté.
            className="flex-shrink-0 flex flex-col items-center gap-2 w-[72px] active:scale-[0.94] transition-transform duration-150"
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
