'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Scissors } from 'lucide-react';
import type { ApiSpecialty } from '@/lib/types';
import { SPECIALTY_ILLUSTRATIONS, getLiveSpecialtyImages } from '@/lib/specialties';

/**
 * Grille de vignettes photo des spécialités d'un coiffeur — PUREMENT
 * informative, aucune vignette n'est cliquable (retour Julien : une
 * spécialité sur un profil ne doit mener nulle part, comme les étiquettes
 * des réalisations). Même langage visuel que les vignettes du filtre de
 * recherche : photo live (Specialty.image_url, administrable) > illustration
 * locale > icône en dernier repli.
 */
export default function SpecialtyPhotoGrid({ specialties }: { specialties: ApiSpecialty[] }) {
  const [liveImages, setLiveImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    getLiveSpecialtyImages().then((map) => { if (!cancelled) setLiveImages(map); });
    return () => { cancelled = true; };
  }, []);

  if (!specialties.length) return null;

  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-3">
      {specialties.map((s) => {
        const img = liveImages[s.slug] ?? SPECIALTY_ILLUSTRATIONS[s.slug] ?? null;
        return (
          <div key={s.slug} className="flex flex-col items-center gap-1.5 text-center">
            <span className="relative w-[54px] h-[54px] rounded-2xl overflow-hidden bg-neutral-100 flex items-center justify-center">
              {img ? (
                <Image src={img} alt={s.name} fill className="object-cover" sizes="54px" />
              ) : (
                <Scissors size={18} className="text-neutral-400" strokeWidth={1.5} />
              )}
            </span>
            <span className="text-[10.5px] leading-tight font-semibold text-neutral-600 line-clamp-2">{s.name}</span>
          </div>
        );
      })}
    </div>
  );
}
