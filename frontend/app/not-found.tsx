import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-neutral-400 mb-4">
        Erreur 404
      </p>
      <h1 className="text-[48px] font-bold leading-none tracking-tight text-neutral-900 mb-3">
        Page introuvable
      </h1>
      <p className="text-sm text-neutral-500 max-w-xs mb-8">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-neutral-900 text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-neutral-700 transition-colors"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
