'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getStoredToken } from '@/lib/auth';
import RecommendationCard from './RecommendationCard';
import Reveal from './Reveal';
import { SectionHeader } from './HomeGeoStrips';
import { getUserGeo, getUserPrefs, getUserSpecialtySlugs, hasExplicitInterests } from '@/lib/homeFilters';
import { fetchHairdressersProgressive } from '@/lib/homeFetch';
import { fetchRecommendations, fromHairdresserProfile } from '@/lib/recommendation';
import type { RecommendationResult, RecommendationMeta } from '@/lib/recommendation';
import { useHomeDedupe } from '@/contexts/HomeDedupeContext';

/**
 * "Pour vous" — section hero de la home, branchée sur le vrai moteur
 * GET /api/recommendations (même service que /app/recherche). Hiérarchie de
 * poids gérée entièrement côté backend : spécialité choisie à l'onboarding
 * D'ABORD, puis proximité, puis réputation, CHAIR+ en tout dernier
 * départage — voir RecommendationService pour le détail des poids.
 *
 * Connecté : le backend lit user_preferences + la géo du compte tout seul,
 * inutile de lui repasser quoi que ce soit d'explicite ici (il ferait
 * prioritaire sur le vrai profil serveur de toute façon). On transmet quand
 * même le relais localStorage en filet de sécurité (compte multi-appareil
 * pas encore synchro).
 * Visiteur : seul le relais localStorage (préférences choisies avant de
 * créer un compte) peut personnaliser — sans lui, rien à segmenter
 * honnêtement, on affiche l'incitation à créer un compte plutôt que
 * d'inventer une préférence.
 */
export default function HomePersonalized({
  titleOverride, limit = 12,
}: { titleOverride?: string | null; limit?: number } = {}) {
  const { user, isLoading } = useAuth();
  const [entries, setEntries] = useState<RecommendationResult[]>([]);
  const [meta, setMeta] = useState<RecommendationMeta | null>(null);
  const [ready, setReady] = useState(false);
  const effectiveLimit = limit && limit > 0 ? limit : 12;
  // "Pour vous" est premier dans le fil — ses picks ont priorité, les
  // sections suivantes (Coup de cœur, Nouveaux talents) les excluent des
  // leurs pour ne jamais montrer deux fois le même coiffeur sur la home.
  const { claim } = useHomeDedupe();

  const guestHasSignal = !user && hasExplicitInterests();

  useEffect(() => {
    if (isLoading) return;
    if (!user && !guestHasSignal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
      return;
    }

    const controller = new AbortController();
    const token = getStoredToken();
    const interests = hasExplicitInterests() ? getUserPrefs().interests : undefined;

    fetchRecommendations({ interests, per_page: effectiveLimit }, token, controller.signal)
      .then((res) => { setEntries(res.data); setMeta(res.meta); claim(res.data.map((e) => e.id)); })
      .catch(async () => {
        // Repli d'urgence — /api/recommendations peut échouer (déploiement
        // backend en retard, panne...). Ne JAMAIS afficher "aucun coiffeur
        // sur CHAIR" dans ce cas, c'est faux : on retombe sur /api/hairdressers
        // (route plus ancienne, indépendante) avec la même cascade
        // géographique que NearbyMapSection, plutôt que sur une section vide.
        try {
          const geo = getUserGeo(user);
          const { results } = await fetchHairdressersProgressive(getUserSpecialtySlugs(), geo, effectiveLimit);
          if (results.length) {
            setEntries(results.map(fromHairdresserProfile));
            setMeta(null);
            claim(results.map((h) => h.id));
          }
        } catch { /* vraiment rien de dispo — l'état vide honnête prend le relais */ }
      })
      .finally(() => setReady(true));

    return () => controller.abort();
  }, [user, isLoading, guestHasSignal, effectiveLimit, claim]);

  if (!ready) {
    return (
      // Pas de Reveal ici — le squelette doit apparaître immédiatement (pas
      // de délai avant le premier retour visuel), seul le contenu final se
      // fond en douceur une fois prêt (voir plus bas). pt-10 : même rythme
      // vertical que toutes les autres sections de la home (pt-6 cassait la
      // cohérence dès qu'une autre section admin passait avant celle-ci).
      <section className="pt-10">
        <div className="px-4 md:px-8 mb-5 flex items-end justify-between">
          <div className="h-6 w-48 bg-neutral-100 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 md:px-8 no-scrollbar">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[172px] md:w-[200px] aspect-[3/4] rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // ── Visiteur sans aucun signal (jamais de préférence inventée) ─────────
  if (!user && !guestHasSignal) {
    return (
      <section className="pt-10 px-4 md:px-8 max-w-6xl md:mx-auto">
        <Reveal>
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
        </Reveal>
      </section>
    );
  }

  // Vraiment aucun profil géolocalisé nulle part sur CHAIR (tier 'empty') —
  // arrive seulement si la base est vide. Jamais de section masquée : on
  // reste honnête plutôt que de faire comme si la home n'avait rien à dire.
  if (entries.length === 0) {
    return (
      <section className="pt-10 px-4 md:px-8 max-w-6xl md:mx-auto">
        <SectionHeader tag="Pour vous" title="Bientôt près de chez vous" />
        <p className="text-[13px] text-neutral-400 -mt-3">
          Aucun coiffeur inscrit sur CHAIR pour le moment. Revenez bientôt.
        </p>
      </section>
    );
  }

  const personalized = meta ? meta.pref_source !== 'none' : false;
  const title = titleOverride ?? (personalized ? 'Selon votre style' : 'Les mieux notés');
  const badge = meta?.is_fallback ? meta.fallback_label ?? undefined : undefined;
  const noGeo = meta?.tier === 'no_geo';

  return (
    <section className="pt-10">
      <Reveal><SectionHeader tag="Pour vous" title={title} href="/app/recherche" badge={badge} /></Reveal>
      <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
        {/* Cascade légère (délai croissant par carte, borné à 4 crans) — la
            promesse "pas juste le plus proche" mérite de se dévoiler carte
            par carte plutôt que d'apparaître comme un bloc figé. */}
        {entries.map((r, i) => (
          <Reveal key={r.id} delay={(i % 4) * 70} className="flex-shrink-0">
            <RecommendationCard r={r} size="lg" />
          </Reveal>
        ))}
      </div>
      {noGeo && user && (
        <Link
          href="/app/compte/modifier"
          className="mx-4 md:mx-8 mt-3 flex items-center gap-2 text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors w-fit"
        >
          <MapPin size={12} />Ajoutez votre ville pour affiner ces résultats
        </Link>
      )}
      {meta?.specialty_filter_relaxed && (
        <p className="mx-4 md:mx-8 mt-3 text-[12px] text-neutral-400">
          Aucun profil ne correspond exactement à votre style dans le secteur — voici les mieux notés autour de vous.
        </p>
      )}
    </section>
  );
}
