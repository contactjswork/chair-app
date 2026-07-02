'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Scissors, Star, Heart, Wind, Zap, Layers, User, Sparkles, Flame } from 'lucide-react';

type LucideIcon = React.ElementType;
type Collection = { title: string; slug: string; Icon: LucideIcon; dark: boolean; };

const DEFAULT_COLS: Collection[] = [
  { title: 'Les meilleurs Barbers',  slug: 'barber',      Icon: Scissors, dark: true  },
  { title: 'Spécialistes Balayage',  slug: 'balayage',    Icon: Star,     dark: false },
  { title: 'Coiffeurs Mariage',      slug: 'mariage',     Icon: Heart,    dark: false },
  { title: 'Cheveux Bouclés',        slug: 'boucles',     Icon: Wind,     dark: false },
  { title: 'Fantasy Colors',         slug: 'coloration',  Icon: Zap,      dark: false },
  { title: 'Extensions',             slug: 'extensions',  Icon: Layers,   dark: true  },
];

const FEMME_COLS: Collection[] = [
  { title: 'Spécialistes Balayage',  slug: 'balayage',    Icon: Sparkles, dark: false },
  { title: 'Coloristes Experts',     slug: 'coloration',  Icon: Zap,      dark: false },
  { title: 'Cheveux Bouclés',        slug: 'boucles',     Icon: Wind,     dark: false },
  { title: 'Coiffeurs Mariage',      slug: 'mariage',     Icon: Heart,    dark: true  },
  { title: 'Extensions',             slug: 'extensions',  Icon: Layers,   dark: false },
  { title: 'Blond & Ombré',          slug: 'blond',       Icon: Star,     dark: false },
];

const HOMME_COLS: Collection[] = [
  { title: 'Les meilleurs Barbers',  slug: 'barber',      Icon: Scissors, dark: true  },
  { title: 'Spécialistes Dégradé',   slug: 'degrade',     Icon: Layers,   dark: false },
  { title: 'Skin Fade',              slug: 'fade',         Icon: Flame,    dark: false },
  { title: 'Barbe & Style',          slug: 'barbe',        Icon: User,     dark: false },
  { title: 'Coupe Classique',        slug: 'coupe-homme',  Icon: Star,     dark: false },
  { title: 'Style Urbain',           slug: 'barber',       Icon: Zap,      dark: true  },
];

export default function HomeCollections() {
  const [cols, setCols]   = useState<Collection[]>(DEFAULT_COLS);
  const [tag, setTag]     = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('chair_preferences');
      if (!raw) return;
      const prefs = JSON.parse(raw) as { gender?: string; interests?: string[] };
      const gender    = prefs.gender;
      const interests = prefs.interests ?? [];

      // If user has specific interests, prioritize collections matching them
      if (interests.length > 0) {
        const interestSet = new Set(interests);
        // Try to build collections from interests first, then fill with gender defaults
        const base = gender === 'homme' ? HOMME_COLS : gender === 'femme' ? FEMME_COLS : DEFAULT_COLS;
        const matched   = base.filter((c) => interestSet.has(c.slug));
        const unmatched = base.filter((c) => !interestSet.has(c.slug));
        // Put matched first, maintain 6 total
        const ordered = [...matched, ...unmatched].slice(0, 6);
        if (ordered.length > 0) {
          setCols(ordered);
          setTag('Pour vous');
          return;
        }
      }

      if (gender === 'femme') {
        setCols(FEMME_COLS);
        setTag('Style femme');
      } else if (gender === 'homme') {
        setCols(HOMME_COLS);
        setTag('Style homme');
      }
    } catch { /* use default */ }
  }, []);

  if (!mounted) {
    return (
      <section className="pt-10">
        <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between">
          <div>
            <div className="h-3 w-16 bg-neutral-100 rounded-full animate-pulse mb-2" />
            <div className="h-6 w-32 bg-neutral-100 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 px-4 md:px-8 max-w-6xl md:mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-3xl min-h-[108px] bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="pt-10">
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between gap-3">
        <div>
          {tag && (
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-violet-500 mb-1.5">{tag}</p>
          )}
          <h2 className="text-[20px] md:text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">Collections</h2>
          <p className="text-[12px] text-neutral-400 mt-1">Explorez par univers</p>
        </div>
        <Link href="/app/recherche" className="flex-shrink-0 flex items-center gap-1 text-[12px] font-semibold text-neutral-400 hover:text-neutral-900 transition-colors">
          Voir tout <ArrowRight size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 px-4 md:px-8 max-w-6xl md:mx-auto">
        {cols.map((col, i) => (
          <Link
            key={col.slug + i}
            href={`/app/recherche?specialty=${col.slug}`}
            className={`flex flex-col justify-between p-5 rounded-3xl min-h-[108px] group hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 ${
              col.dark ? 'bg-neutral-900' : 'bg-neutral-50 border border-neutral-100'
            }`}
          >
            <col.Icon size={22} className={col.dark ? 'text-white/60' : 'text-violet-600'} strokeWidth={1.5} />
            <div>
              <p className={`text-[13px] font-bold leading-tight ${col.dark ? 'text-white' : 'text-neutral-900'}`}>{col.title}</p>
              <div className={`flex items-center gap-0.5 mt-1.5 text-[11px] font-semibold ${col.dark ? 'text-white/40' : 'text-neutral-400'}`}>
                Découvrir <ArrowRight size={10} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
