'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import HairdresserCard from './HairdresserCard';
import { SectionHeader } from './HomeGeoStrips';
import { getUserGeo, getUserSpecialtySlugs, hasExplicitInterests } from '@/lib/homeFilters';
import { fetchHairdressersProgressive } from '@/lib/homeFetch';
import type { ApiHairdresserProfile } from '@/lib/types';

/**
 * "Pour vous" — UNE seule section qui mélange TOUTES les spécialités choisies
 * par l'utilisateur (plus de tirage d'une seule au hasard). Essaie d'abord
 * près de sa ville réelle, élargit si besoin — jamais de section vide juste
 * parce que la couverture locale est encore faible ou que la ville manque.
 */
export default function HomePersonalized() {
  const { user, isLoading } = useAuth();
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>([]);
  const [ready, setReady] = useState(false);
  const [isGeo, setIsGeo] = useState(false);
  const [hasLocation, setHasLocation] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
      return;
    }

    const geo = getUserGeo(user);
    setHasLocation(!!geo);
    const slugs = getUserSpecialtySlugs();

    fetchHairdressersProgressive(slugs, geo, 10)
      .then(({ results, isGeo: geoHit }) => { setHairdressers(results); setIsGeo(geoHit); })
      .finally(() => setReady(true));
  }, [user, isLoading]);

  if (!ready) {
    return (
      <section className="pt-9">
        <div className="px-4 mb-5 flex items-end justify-between">
          <div className="h-6 w-48 bg-neutral-100 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[160px] aspect-[3/4] rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // ── Visiteur non connecté ──────────────────────────────────────────────
  if (!user) {
    return (
      <section className="mt-10 px-4 md:px-8 max-w-6xl md:mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-neutral-900 px-6 py-7">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={12} className="text-white/50" />
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/50">Pour vous</p>
            </div>
            <h2 className="text-[20px] font-bold text-white leading-tight mb-2">
              Le bon coiffeur,<br />selon votre style.
            </h2>
            <p className="text-[13px] text-white/55 leading-relaxed mb-5">
              Créez un compte gratuit, CHAIR sélectionne les profils faits pour vous.
            </p>
            <div className="flex gap-2">
              <Link href="/inscription" className="flex items-center gap-2 bg-white text-neutral-900 font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-neutral-100 active:scale-[0.97] transition-all">
                <UserPlus size={14} />Créer un compte
              </Link>
              <Link href="/connexion" className="flex items-center gap-2 border border-white/20 text-white font-semibold text-[13px] px-4 py-2.5 rounded-xl hover:bg-white/10 active:scale-[0.97] transition-all">
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Vraiment rien nulle part (même en national) — arrive seulement sur une
  // spécialité ultra-niche sans aucun coiffeur inscrit. Jamais de blocage
  // par simple absence de ville : on montre juste un rappel discret en plus.
  if (hairdressers.length === 0) return null;

  return (
    <section className="mt-10 md:mt-14">
      <SectionHeader
        tag="Pour vous"
        title={hasExplicitInterests() ? 'Selon votre style' : 'Près de chez vous'}
        href="/app/recherche"
      />
      <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
        {hairdressers.map((h) => (
          <div key={h.id} className="flex-shrink-0 w-[160px] md:w-[190px]">
            <HairdresserCard hairdresser={h} showFlame={false} />
          </div>
        ))}
      </div>
      {!hasLocation && (
        <Link
          href="/app/compte/modifier"
          className="mx-4 md:mx-8 mt-3 flex items-center gap-2 text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors w-fit"
        >
          <MapPin size={12} />Ajoutez votre ville pour affiner ces résultats
        </Link>
      )}
      {hasLocation && !isGeo && (
        <p className="mx-4 md:mx-8 mt-3 text-[12px] text-neutral-400">
          Aucun résultat tout près — élargi au national.
        </p>
      )}
    </section>
  );
}
