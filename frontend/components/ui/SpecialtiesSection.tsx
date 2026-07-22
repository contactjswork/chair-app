'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ApiSpecialty } from '@/lib/types';

const SPECIALTY_TILES: Record<string, string> = {
  'couleur-balayage':     'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=300&q=80',
  'coupe-femme':          'https://images.unsplash.com/photo-1595476589022-7c86ade2c24d?w=300&q=80',
  'coupe-homme':          'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&q=80',
  'barbe':                'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&q=80',
  'boucles-curly':        'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=300&q=80',
  'extensions':           'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=300&q=80',
  'texture-lissage':      'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=300&q=80',
  'evenementiel':         'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=80',
  'afro-locks':           'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80',
  'soins-transformation': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&q=80',
};

// Slugs pertinents pour une recherche côté clientèle féminine (unisexe compris)
const FEMALE_SLUGS = new Set([
  'couleur-balayage', 'coupe-femme', 'boucles-curly', 'texture-lissage',
  'extensions', 'evenementiel', 'afro-locks', 'soins-transformation',
]);

// Slugs pertinents pour une recherche côté clientèle masculine (unisexe compris)
const MALE_SLUGS = new Set([
  'coupe-homme', 'barbe', 'afro-locks', 'texture-lissage',
  'couleur-balayage', 'soins-transformation',
]);

function filterByGender(specialties: ApiSpecialty[], gender: string | null): ApiSpecialty[] {
  if (gender === 'femme') return specialties.filter((s) => FEMALE_SLUGS.has(s.slug));
  if (gender === 'homme') return specialties.filter((s) => MALE_SLUGS.has(s.slug));
  return specialties;
}

interface Props {
  specialties: ApiSpecialty[];
}

export default function SpecialtiesSection({ specialties }: Props) {
  const [gender, setGender] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('chair_preferences');
      if (raw) {
        const prefs = JSON.parse(raw);
        setGender(prefs.gender ?? null);
      }
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  if (!ready || specialties.length === 0) return null;

  const filtered = filterByGender(specialties, gender);
  if (filtered.length === 0) return null;

  return (
    <section className="pt-8 md:pt-12 pb-2">
      {/* Header */}
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] md:text-[19px] font-bold text-neutral-900 tracking-tight leading-tight">
            Explorer par spécialité
          </h2>
        </div>
        <Link
          href="/app/recherche"
          className="flex-shrink-0 flex items-center gap-1 text-[12px] font-semibold text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          Voir tout <ArrowRight size={12} />
        </Link>
      </div>

      {/* Tuiles */}
      <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-2 no-scrollbar">
        {filtered.map((s) => {
          const photo = SPECIALTY_TILES[s.slug];
          return (
            <Link
              key={s.slug}
              href={`/app/recherche?specialty=${s.slug}`}
              className="flex-shrink-0 group"
            >
              <div className="relative w-[84px] h-[84px] md:w-[100px] md:h-[100px] rounded-2xl overflow-hidden bg-neutral-900">
                {photo && (
                  <Image
                    src={photo}
                    alt={s.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="100px"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-1.5 text-center">
                  <p className="text-[9px] md:text-[10px] font-semibold text-white leading-tight">
                    {s.name}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
