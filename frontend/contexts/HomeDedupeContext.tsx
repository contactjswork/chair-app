'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface HomeDedupeValue {
  claimed: Set<number>;
  claim: (ids: number[]) => void;
}

const EMPTY_SET = new Set<number>();
function noop() {}

const HomeDedupeContext = createContext<HomeDedupeValue | null>(null);

/**
 * Évite qu'un même coiffeur apparaisse dans plusieurs sections "personnes"
 * de la home (Pour vous / Coup de cœur / Nouveaux talents) — retour direct
 * de Julien : "on retrouve dans chaque partie à chaque fois les mêmes
 * coiffeurs". Chaque section fetch son propre pool indépendamment côté
 * client (pas de coordination serveur) ; ce contexte comble ça après coup :
 * chaque section "réclame" les ids qu'elle affiche une fois son fetch résolu,
 * les sections suivantes filtrent leur liste contre l'UNION de tout ce qui a
 * déjà été réclamé — peu importe l'ordre réel de résolution réseau, un
 * changement du Set déclenche un re-render de tous les consommateurs.
 *
 * Jamais de section vide "pour de faux" : si l'exclusion réduit une section
 * sous sa limite configurée, elle affiche simplement moins d'entrées plutôt
 * que d'aller chercher un remplaçant — pas de sur-ingénierie ici, surtout
 * utile en production où le pool de coiffeurs par ville est bien plus large
 * qu'en local.
 */
export function HomeDedupeProvider({ children }: { children: React.ReactNode }) {
  const [claimed, setClaimed] = useState<Set<number>>(EMPTY_SET);

  const claim = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    setClaimed((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ids) {
        if (!next.has(id)) { next.add(id); changed = true; }
      }
      return changed ? next : prev;
    });
  }, []);

  return <HomeDedupeContext.Provider value={{ claimed, claim }}>{children}</HomeDedupeContext.Provider>;
}

/** Repli sûr hors provider (rendu isolé, tests) — ne filtre jamais rien plutôt que de planter. */
export function useHomeDedupe(): HomeDedupeValue {
  return useContext(HomeDedupeContext) ?? { claimed: EMPTY_SET, claim: noop };
}

/**
 * Filtre `items` contre ce qu'ont déjà réclamé les AUTRES sections, réclame
 * en retour ce que CETTE section affiche, et renvoie la liste finale limitée.
 * Piège évité ici — sans `ownIds` (état, jamais un ref lu pendant le rendu),
 * une section qui filtre sur `!claimed.has(id)` puis réclame ses propres ids
 * provoquerait sa propre exclusion au rendu suivant (le Set partagé change,
 * le composant se re-render, ses propres ids sont maintenant "déjà pris" ...
 * par lui-même) : la section s'auto-viderait. `ownIds` mémorise ce que CE
 * composant a lui-même réclamé pour ne jamais se l'auto-interdire.
 */
export function useDedupedList<T>(items: T[], getId: (item: T) => number, limit: number): T[] {
  const { claimed, claim } = useHomeDedupe();
  const [ownIds, setOwnIds] = useState<Set<number>>(EMPTY_SET);

  const displayed = items
    .filter((item) => {
      const id = getId(item);
      return ownIds.has(id) || !claimed.has(id);
    })
    .slice(0, limit > 0 ? limit : items.length);

  useEffect(() => {
    const ids = displayed.map(getId);
    // Synchronise l'état "ce que j'ai moi-même déjà réclamé" avec le fetch
    // qui vient de résoudre — même pattern justifié qu'ailleurs sur la home
    // (voir SpecialtyQuickLinks.tsx, HomePersonalized.tsx) : dérivé d'une
    // source externe (réponse réseau), impossible à faire pendant le rendu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ids) { if (!next.has(id)) { next.add(id); changed = true; } }
      return changed ? next : prev;
    });
    claim(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed.map(getId).join(',')]);

  return displayed;
}
