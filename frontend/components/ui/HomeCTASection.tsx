'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  hairdressersCount: number;
  postsCount: number;
}

export default function HomeCTASection({ hairdressersCount, postsCount }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  const isHairdresser = user?.role === 'hairdresser';

  return (
    <section className="px-4 md:px-8 max-w-6xl md:mx-auto mt-14 mb-12 space-y-4">

      {/* Bloc coiffeur — visible si visiteur ou client */}
      {!isHairdresser && (
        <div className="bg-neutral-900 rounded-3xl px-6 py-10 md:py-12 md:px-12">
          <div className="md:flex md:items-center md:justify-between gap-8">
            <div className="mb-6 md:mb-0">
              <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-neutral-500 mb-3">
                Pour les professionnels
              </p>
              <h3 className="text-[22px] md:text-[26px] font-bold text-white leading-tight mb-3">
                Vous êtes coiffeur ?
              </h3>
              <p className="text-[13px] text-neutral-400 leading-relaxed max-w-sm">
                Créez votre profil, publiez votre portfolio et développez votre audience.
                Passez à Pro pour la réservation en ligne et l&apos;agenda professionnel.
              </p>
              <div className="flex items-center gap-5 mt-4 text-white">
                <div>
                  <p className="text-[15px] font-bold leading-none">Profil</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Gratuit</p>
                </div>
                <div className="w-px h-6 bg-neutral-700" />
                <div>
                  <p className="text-[15px] font-bold leading-none">Portfolio</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Illimité</p>
                </div>
                <div className="w-px h-6 bg-neutral-700" />
                <div>
                  <p className="text-[15px] font-bold leading-none">Pro</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">dès 29€/mois</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:min-w-[200px]">
              <a
                href="https://getchair.app/pro/inscription"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-white text-neutral-900 text-sm font-semibold px-6 py-3.5 rounded-full hover:bg-neutral-100 transition-colors text-center"
              >
                Créer mon profil gratuit
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Bloc client — visible seulement si non connecté */}
      {!user && (
        <div className="bg-neutral-50 border border-neutral-100 rounded-3xl px-6 py-8 md:py-10 md:px-12 md:flex md:items-center md:justify-between gap-8">
          <div className="mb-5 md:mb-0">
            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-neutral-400 mb-2">
              Pour les clients
            </p>
            <h3 className="text-[19px] md:text-[22px] font-bold text-neutral-900 leading-tight mb-2">
              Votre coiffeur.
              <span className="italic font-light text-neutral-500"> Pas juste le plus proche.</span>
            </h3>
            <p className="text-[12px] text-neutral-500">
              {hairdressersCount > 0 ? `${hairdressersCount}+ coiffeurs · ` : ''}
              {postsCount > 0 ? `${postsCount}+ réalisations · ` : ''}
              Avis certifiés
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/inscription"
              className="inline-flex items-center justify-center bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-full hover:bg-neutral-700 transition-colors"
            >
              Créer un compte
            </Link>
            <Link
              href="/app/recherche"
              className="inline-flex items-center justify-center text-neutral-600 text-sm font-medium px-5 py-3 rounded-full border border-neutral-200 hover:border-neutral-400 transition-colors"
            >
              Explorer
            </Link>
          </div>
        </div>
      )}

    </section>
  );
}
