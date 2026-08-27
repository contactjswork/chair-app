'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Barrière d'erreur des routes.
 *
 * Elle n'affichait qu'un message générique et ignorait purement et simplement
 * l'objet d'erreur : aucune trace, aucun message, rien à se mettre sous la
 * dent. Un plantage survenu dans l'app native devenait indiagnostiquable —
 * constaté sur la page Recherche, impossible à reproduire sur le web.
 *
 * L'erreur part donc en console (le seul moyen de la lire sur un iPhone
 * branché au Mac, via Safari → Développement), et sa nature technique est
 * affichée discrètement sous les boutons. Ce n'est pas de la décoration :
 * sans elle, la seule façon d'avancer est de deviner.
 *
 * `digest` est l'identifiant que Next.js attribue aux erreurs survenues côté
 * serveur — le message y est masqué par sécurité, mais l'identifiant permet
 * de retrouver la trace complète dans les journaux de l'hébergeur.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[erreur route]', error);
  }, [error]);

  const detail = error?.message?.trim();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-neutral-400 mb-4">
        Erreur
      </p>
      <h1 className="text-[36px] font-bold leading-none tracking-tight text-neutral-900 mb-3">
        Quelque chose s&apos;est mal passé
      </h1>
      <p className="text-sm text-neutral-500 max-w-xs mb-8">
        Une erreur inattendue s&apos;est produite. Vérifiez votre connexion et réessayez.
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
          Retour à l&apos;accueil
        </Link>
      </div>

      {/* Volontairement LISIBLE, pas discret. Le débogage Safari est désactivé
          dans les binaires distribués (webContentsDebuggingEnabled: false) :
          ce bloc est la seule fenêtre sur un plantage survenu dans l'app.
          Une première version en gris très clair était invisible sur un écran
          de téléphone — un diagnostic qu'on ne peut pas lire ne sert à rien.
          `select-all` pour que le texte se copie d'un appui long. */}
      {(detail || error?.digest) && (
        <div className="mt-10 w-full max-w-sm rounded-2xl bg-neutral-100 px-4 py-3 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-1.5">
            Détail technique
          </p>
          <p className="select-all text-[12px] leading-relaxed text-neutral-700 break-words">
            {detail || 'Erreur sans message'}
            {error?.digest ? ` · ${error.digest}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
