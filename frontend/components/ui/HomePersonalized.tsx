'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

// Photo map built from onboarding data (Unsplash)
const STYLE_ICONS: Record<string, string> = {
  // Femme
  balayage:        '/onboarding/balayage.png',
  'coupe-femme':   '/onboarding/coupe.png',
  boucles:         '/onboarding/boucles.png',
  lissage:         '/onboarding/lissage.png',
  coloration:      '/onboarding/couleur-femme.png',
  chignon:         '/onboarding/chignon.png',
  // Homme
  barber:          '/onboarding/barber.png',
  'coupe-homme':   '/onboarding/classique.png',
  'coupe-longue':  '/onboarding/cheveux-longs.png',
  barbe:           '/onboarding/barbe.png',
  'couleur-homme': '/onboarding/couleur.png',
  dreads:          '/onboarding/dreads.png',
  // Fallbacks
  'coupe-courte':  '/onboarding/classique.png',
  extensions:      '/onboarding/lissage.png',
  mariage:         '/onboarding/chignon.png',
  degrade:         '/onboarding/barber.png',
};

const STYLE_LABELS: Record<string, string> = {
  // Femme
  balayage:        'Balayage',
  'coupe-femme':   'Coupe & Frange',
  boucles:         'Boucles',
  lissage:         'Lissage',
  coloration:      'Couleur Créative',
  chignon:         'Chignon & Soirée',
  // Homme
  barber:          'Barber & Dégradé',
  'coupe-homme':   'Coupe Classique',
  'coupe-longue':  'Cheveux Longs',
  barbe:           'Barbe',
  'couleur-homme': 'Couleur & Créatif',
  dreads:          'Dreads & Locks',
  // Fallbacks
  'coupe-courte':  'Coupe Courte',
  extensions:      'Extensions',
  mariage:         'Mariage',
  degrade:         'Dégradé',
};

// Default inspirations for users without preferences
const DEFAULT_SLUGS = ['balayage', 'barber', 'boucles', 'coloration', 'dreads', 'lissage', 'chignon', 'barbe'];

// Gender-based fallback slugs
const FEMME_SLUGS  = ['balayage', 'coupe-femme', 'boucles', 'lissage', 'coloration', 'chignon'];
const HOMME_SLUGS  = ['barber', 'coupe-homme', 'coupe-longue', 'barbe', 'couleur-homme', 'dreads'];

interface InspirationCard { slug: string; label: string; icon: string; }

function toCards(slugs: string[]): InspirationCard[] {
  return slugs
    .map((slug) => ({ slug, label: STYLE_LABELS[slug] ?? slug, icon: STYLE_ICONS[slug] ?? '' }))
    .filter((c) => c.icon);
}

export default function HomePersonalized() {
  const [inspirations, setInspirations]   = useState<InspirationCard[]>([]);
  const [sectionTitle, setSectionTitle]   = useState('Inspirations du moment');
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [mounted, setMounted]             = useState(false);

  useEffect(() => {
    setMounted(true);

    try {
      const raw = localStorage.getItem('chair_preferences');
      const prefs = raw ? (JSON.parse(raw) as { gender?: string; interests?: string[] }) : {};
      const interests = prefs.interests ?? [];
      const gender    = prefs.gender;

      // Toujours afficher toutes les catégories du genre sélectionné
      const genderSlugs = gender === 'femme' ? FEMME_SLUGS
                        : gender === 'homme' ? HOMME_SLUGS
                        : null;
      const slugsToShow = genderSlugs ?? (interests.length > 0 ? interests : DEFAULT_SLUGS);

      if (slugsToShow.length > 0) {
        const cards = toCards(slugsToShow);
        if (cards.length > 0) {
          setInspirations(cards);
          setSectionTitle('Inspirations pour vous');
          setIsPersonalized(true);
          return;
        }
      }

      setInspirations(toCards(DEFAULT_SLUGS));
    } catch {
      setInspirations(toCards(DEFAULT_SLUGS));
    }
  }, []);

  if (!mounted) {
    return (
      <section className="pt-9">
        <div className="px-4 mb-5 flex items-end justify-between">
          <div className="h-6 w-48 bg-neutral-100 rounded-full animate-pulse" />
          <div className="h-4 w-14 bg-neutral-100 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-x-hidden px-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-[100px] h-[130px] rounded-3xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Inspirations section */}
      <section className="pt-9 md:pt-10">
        <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between gap-3">
          <div>
            {isPersonalized && (
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-400 mb-1.5">Pour vous</p>
            )}
            <h2 className="text-[20px] md:text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">{sectionTitle}</h2>
          </div>
          <Link href="/app/recherche" className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <ChevronRight size={16} strokeWidth={2.5} className="text-neutral-900" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-2 no-scrollbar">
          {inspirations.map((insp) => (
            <Link
              key={insp.slug}
              href={`/app/recherche?specialty=${insp.slug}`}
              className="flex-shrink-0 flex flex-col items-center gap-2 w-[72px] active:scale-[0.88] transition-transform duration-150"
            >
              <div className="w-[76px] h-[76px] rounded-full border-2 border-neutral-900 flex items-center justify-center bg-white">
                <Image
                  src={insp.icon}
                  alt={insp.label}
                  width={54}
                  height={54}
                  className="object-contain mix-blend-multiply"
                />
              </div>
              <p className="text-[11px] font-semibold text-neutral-700 text-center leading-tight">{insp.label}</p>
            </Link>
          ))}
        </div>
      </section>

    </>
  );
}
