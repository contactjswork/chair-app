'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// L'accueil gérant a déménagé : il vit désormais dans l'espace CHAIR BUSINESS
// (/business — décision Julien 02/09/2026, plus de monde gérant dans CHAIR
// PRO). Cette route ne subsiste que pour les anciens liens/deep links.
export default function AncienAccueilGerant() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/business');
  }, [router]);

  return null;
}
