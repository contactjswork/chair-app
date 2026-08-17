'use client';

// État central de la page Recherche — la carte, la liste et les filtres
// consomment LE MÊME état et les MÊMES résultats. Toute modification passe
// par ici : debounce, annulation des requêtes obsolètes, pagination.

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchExplore, getClientPrefs } from '@/lib/explore';
import type { ExploreBbox, ExploreCounts, ExploreResult, ExploreSort, ExploreType } from '@/lib/explore';
import type { RecommendationFallback } from '@/lib/recommendation';

const PER_PAGE = 40;

export interface ExploreFilters {
  q: string;
  specialties: string[];
  city: string | null;
  cityCoords: { lat: number; lng: number } | null;
  useMyPosition: boolean;
  radius: number | null;
  type: ExploreType;
  sort: ExploreSort;
  minRating: number;
}

export const DEFAULT_FILTERS: ExploreFilters = {
  q: '',
  specialties: [],
  city: null,
  cityCoords: null,
  useMyPosition: false,
  radius: 20,
  type: 'all',
  sort: 'relevance',
  minRating: 0,
};

export function useExploreSearch(userLocation: { lat: number; lng: number } | null) {
  const [filters, setFiltersState] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [bbox, setBbox]            = useState<ExploreBbox | null>(null);

  const [results, setResults]       = useState<ExploreResult[]>([]);
  const [counts, setCounts]         = useState<ExploreCounts | null>(null);
  const [total, setTotal]           = useState(0);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(false);
  // Repli honnête — voir contrat RecommendationFallback (lib/recommendation.ts) :
  // null tant qu'aucune recherche n'a dû s'écarter des critères exacts.
  const [fallback, setFallback]           = useState<RecommendationFallback | null>(null);
  const [specialtyRelaxed, setSpecialtyRelaxed] = useState(false);

  const abortRef    = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef     = useRef(1);
  const [reloadTick, setReloadTick] = useState(0);

  /** Patch de filtres — un changement de localisation annule la zone carte. */
  const setFilters = useCallback((patch: Partial<ExploreFilters>) => {
    if ('city' in patch || 'cityCoords' in patch || 'useMyPosition' in patch || 'radius' in patch) {
      setBbox(null);
    }
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setBbox(null);
    setFiltersState((prev) => ({
      ...DEFAULT_FILTERS,
      // La localisation active est conservée — "tout effacer" ne doit pas
      // téléporter l'utilisateur hors de sa zone.
      city: prev.city,
      cityCoords: prev.cityCoords,
      useMyPosition: prev.useMyPosition,
    }));
  }, []);

  const searchInArea = useCallback((area: ExploreBbox) => {
    setBbox(area);
  }, []);

  const center = bbox
    ? null
    : filters.useMyPosition && userLocation
      ? userLocation
      : filters.cityCoords;

  // ── Requête principale ────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pageRef.current = 1;

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(false);

      try {
        const interests = getClientPrefs().interests ?? [];

        const explore = await fetchExplore({
          q: filters.q,
          specialty: filters.specialties,
          lat: center?.lat,
          lng: center?.lng,
          radius: center && filters.radius != null ? filters.radius : undefined,
          bbox,
          min_rating: filters.minRating || undefined,
          type: filters.type,
          sort: filters.sort,
          interests,
          page: 1,
          per_page: PER_PAGE,
        }, controller.signal);

        if (controller.signal.aborted) return;

        setResults(explore.data);
        setCounts(explore.counts);
        setTotal(explore.total);
        setFallback(explore.fallback);
        setSpecialtyRelaxed(explore.specialty_filter_relaxed);
        setIsLoading(false);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setResults([]);
        setCounts(null);
        setTotal(0);
        setFallback(null);
        setSpecialtyRelaxed(false);
        setError(true);
        setIsLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.q, filters.specialties, filters.minRating, filters.type, filters.sort,
    filters.radius, filters.useMyPosition,
    center?.lat, center?.lng, bbox, reloadTick,
  ]);

  const loadMore = useCallback(async () => {
    const nextPage = pageRef.current + 1;
    try {
      const explore = await fetchExplore({
        q: filters.q,
        specialty: filters.specialties,
        lat: center?.lat,
        lng: center?.lng,
        radius: center && filters.radius != null ? filters.radius : undefined,
        bbox,
        min_rating: filters.minRating || undefined,
        type: filters.type,
        sort: filters.sort,
        interests: getClientPrefs().interests ?? [],
        page: nextPage,
        per_page: PER_PAGE,
      });
      pageRef.current = nextPage;
      setResults((prev) => [...prev, ...explore.data]);
    } catch { /* le bouton reste affiché, l'utilisateur peut réessayer */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, center?.lat, center?.lng, bbox]);

  const retry = useCallback(() => setReloadTick((t) => t + 1), []);

  return {
    filters,
    setFilters,
    resetFilters,
    bbox,
    searchInArea,
    center,
    results,
    counts,
    total,
    fallback,
    specialtyRelaxed,
    hasMore: results.length < total,
    loadMore,
    isLoading,
    error,
    retry,
  };
}
