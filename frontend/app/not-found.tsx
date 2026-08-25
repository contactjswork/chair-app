'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isNativeApp } from '@/hooks/useGeolocation';

export default function NotFound() {
  // Dans l'app native, "/" est le site vitrine : il y renvoyait le visiteur
  // vers /download, qui annonce "Bientôt sur l'App Store" — c'est-à-dire que
  // l'app se décrivait comme non publiée à l'intérieur d'elle-même (App Store
  // Review Guideline 2.1). Depuis l'app, le retour se fait vers /app.
  const [href, setHref] = useState('/');

  useEffect(() => {
    if (isNativeApp()) setHref('/app');
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-neutral-400 mb-4">
        Erreur 404
      </p>
      <h1 className="text-[48px] font-bold leading-none tracking-tight text-neutral-900 mb-3">
        Page introuvable
      </h1>
      <p className="text-sm text-neutral-500 max-w-xs mb-8">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 bg-neutral-900 text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-neutral-700 transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
