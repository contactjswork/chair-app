'use client';

import Link from 'next/link';
import { Camera } from 'lucide-react';

interface Props {
  /** Où l'icône doit se positionner : sur la bannière ou sur l'avatar. */
  variant: 'banner' | 'avatar';
  className?: string;
}

// Petite affordance discrète, visible uniquement par le propriétaire du
// profil, pour retoucher rapidement banniere/photo sans quitter la vue
// publique. Renvoie vers l'édition complète — pas d'upload inline ici pour
// éviter de dupliquer la logique de recadrage déjà dans /pro/profil.
export default function PublicProfileOwnerActions({ variant, className }: Props) {
  const size = variant === 'banner' ? 13 : 11;
  return (
    <Link
      href="/pro/profil"
      title="Modifier depuis mon profil pro"
      aria-label="Modifier"
      className={
        className ??
        (variant === 'banner'
          ? 'absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/55 transition-colors'
          : 'absolute -bottom-0.5 -right-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-neutral-900 text-white border-2 border-white shadow-sm hover:bg-neutral-700 transition-colors')
      }
    >
      <Camera size={size} strokeWidth={2} />
    </Link>
  );
}
