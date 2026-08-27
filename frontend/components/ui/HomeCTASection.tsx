'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import Reveal from '@/components/ui/Reveal';

interface Props {
  hairdressersCount: number;
  postsCount: number;
}

export default function HomeCTASection({ hairdressersCount, postsCount }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  const isHairdresser = user?.role === 'hairdresser';

  return (
    <section className="px-4 md:px-8 max-w-6xl md:mx-auto mt-10 mb-12 space-y-4">

      {/* Bloc coiffeur — visible si visiteur ou client */}
      {!isHairdresser && (
        <Reveal>
          <div className="relative overflow-hidden bg-neutral-900 rounded-3xl px-6 py-10 md:py-12 md:px-12">
            {/* Même halo discret que la carte "Pour vous" visiteur — signature
                visuelle commune aux deux seuls fonds noirs de la home. */}
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
            <div className="relative md:flex md:items-center md:justify-between gap-8">
              <div className="mb-6 md:mb-0">
                <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-neutral-500 mb-3">
                  Pour les professionnels
                </p>
                <h3 className="text-[22px] md:text-[26px] font-bold text-white leading-tight mb-3">
                  Vous êtes coiffeur ?
                </h3>
                <p className="text-[13px] text-neutral-400 leading-relaxed max-w-sm">
                  Créez votre profil, publiez votre portfolio et développez votre clientèle.
                  Réservation en ligne, agenda et classement local inclus.
                </p>
                <div className="flex items-center gap-5 mt-4 text-white">
                  <div>
                    <p className="text-[15px] font-bold leading-none">Profil</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Gratuit</p>
                  </div>
                  <div className="w-px h-6 bg-neutral-700" />
                  <div>
                    <p className="text-[15px] font-bold leading-none">Agenda</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Réservations en ligne</p>
                  </div>
                  <div className="w-px h-6 bg-neutral-700" />
                  <div>
                    <p className="text-[15px] font-bold leading-none">Visibilité</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Classement local</p>
                  </div>
                </div>
              </div>

              {/* L'inscription pro sort de l'app cliente — target="_blank",
                  comme le même lien dans Compte. Dans le binaire natif, une
                  demande de nouvelle fenêtre est confiée au navigateur du
                  système : sans ça, le client se retrouvait embarqué dans le
                  parcours coiffeur à l'intérieur de CHAIR, sans retour
                  possible. L'app cliente ne doit jamais héberger l'espace pro. */}
              <div className="flex flex-col gap-2 md:min-w-[200px]">
                <Link
                  href="/pro/inscription"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-white text-neutral-900 text-sm font-semibold px-6 py-3.5 rounded-2xl hover:bg-neutral-100 active:scale-[0.97] transition-all text-center"
                >
                  Créer mon profil gratuit
                </Link>
                <p className="text-[10px] text-neutral-500 text-center leading-relaxed">
                  Sur CHAIR PRO, l&apos;espace coiffeur séparé
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* Bloc client — visible seulement si non connecté */}
      {!user && (
        <Reveal>
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
              <PrimaryButton href="/inscription">Créer un compte</PrimaryButton>
              <SecondaryButton href="/app/recherche">Explorer</SecondaryButton>
            </div>
          </div>
        </Reveal>
      )}

    </section>
  );
}
