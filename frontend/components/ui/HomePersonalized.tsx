'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

// Photo map — aligné sur les 10 spécialités CHAIR
const STYLE_ICONS: Record<string, string> = {
  'couleur-balayage':     '/onboarding/balayage.png',
  'coupe-femme':          '/onboarding/coupe.png',
  'boucles-curly':        '/onboarding/boucles.png',
  'texture-lissage':      '/onboarding/lissage.png',
  'soins-transformation': '/onboarding/couleur.png',
  'evenementiel':         '/onboarding/chignon.png',
  'coupe-homme':          '/onboarding/classique.png',
  'extensions':           '/onboarding/cheveux-longs.png',
  'barbe':                '/onboarding/barbe.png',
  'afro-locks':           '/onboarding/dreads.png',
};

const STYLE_LABELS: Record<string, string> = {
  'couleur-balayage':     'Couleur & Balayage',
  'coupe-femme':          'Coupe Femme',
  'boucles-curly':        'Boucles & Curly',
  'texture-lissage':      'Texture & Lissage',
  'soins-transformation': 'Soins & Transformation',
  'evenementiel':         'Événementiel',
  'coupe-homme':          'Coupe Homme',
  'extensions':           'Extensions',
  'barbe':                'Barbe',
  'afro-locks':           'Afro & Locks',
};

// Default inspirations for users without preferences
const DEFAULT_SLUGS = ['couleur-balayage', 'coupe-homme', 'boucles-curly', 'afro-locks', 'evenementiel', 'texture-lissage', 'coupe-femme', 'extensions'];

// Gender-based fallback slugs
const FEMME_SLUGS  = ['couleur-balayage', 'coupe-femme', 'boucles-curly', 'texture-lissage', 'evenementiel', 'extensions'];
const HOMME_SLUGS  = ['coupe-homme', 'barbe', 'afro-locks', 'texture-lissage', 'couleur-balayage', 'extensions'];

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
              <div className="w-[76px] h-[76px] rounded-[20px] border-2 border-neutral-900 flex items-center justify-center bg-white">
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
