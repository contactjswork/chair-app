'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  hairdressersCount: number;
  postsCount: number;
}

export default function HomeCTABlock({ hairdressersCount, postsCount }: Props) {
  const { user, isLoading } = useAuth();

  // Ne pas afficher si connecté (client ou coiffeur)
  if (isLoading || user) return null;

  return (
    <section className="px-4 md:px-8 max-w-6xl md:mx-auto mt-14 mb-10">
      <div className="bg-neutral-900 rounded-3xl px-6 py-10 md:py-14 md:px-14 text-center md:text-left md:flex md:items-center md:justify-between">
        <div className="mb-6 md:mb-0">
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-neutral-500 mb-3">
            La plateforme qui change tout
          </p>
          <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-4">
            Votre coiffeur.
            <br />
            <span className="text-neutral-400 font-light italic">Pas juste le plus proche.</span>
          </h3>
          <div className="flex items-center justify-center md:justify-start gap-6 text-white">
            <div>
              <p className="text-2xl font-bold">{hairdressersCount}+</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">Coiffeurs</p>
            </div>
            <div className="w-px h-8 bg-neutral-700" />
            <div>
              <p className="text-2xl font-bold">{postsCount}+</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">Réalisations</p>
            </div>
            <div className="w-px h-8 bg-neutral-700" />
            <div>
              <p className="text-2xl font-bold">100%</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">Gratuit</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:min-w-[180px] md:items-end">
          <Link
            href="/inscription"
            className="inline-flex items-center justify-center bg-white text-neutral-900 text-sm font-semibold px-6 py-3.5 rounded-full hover:bg-neutral-100 transition-colors"
          >
            Créer mon profil
          </Link>
          <Link
            href="/app/recherche"
            className="inline-flex items-center justify-center text-neutral-400 text-sm font-medium px-6 py-3.5 rounded-full border border-neutral-700 hover:border-neutral-500 hover:text-white transition-all"
          >
            Explorer
          </Link>
        </div>
      </div>
    </section>
  );
}
