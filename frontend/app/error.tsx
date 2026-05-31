'use client';

import Link from 'next/link';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-neutral-400 mb-4">
        Erreur
      </p>
      <h1 className="text-[36px] font-bold leading-none tracking-tight text-neutral-900 mb-3">
        Quelque chose s'est mal passé
      </h1>
      <p className="text-sm text-neutral-500 max-w-xs mb-8">
        Une erreur inattendue s'est produite. Vérifiez votre connexion et réessayez.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-neutral-900 text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-neutral-700 transition-colors"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 border border-neutral-200 text-neutral-700 text-sm font-medium px-6 py-3 rounded-full hover:border-neutral-400 transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
