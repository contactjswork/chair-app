'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, ChevronDown, LayoutGrid, Loader2, MapPinOff, RefreshCw, User } from 'lucide-react';
import TopNav from '@/components/layout/TopNav';
import BottomNav from '@/components/layout/BottomNav';
import ReviewPromptTrigger from '@/components/ui/ReviewPromptTrigger';
import GeoPermissionModal from '@/components/ui/GeoPermissionModal';
import SearchMap, { type SearchMapHandle } from '@/components/search/SearchMap';
import SearchFloatingBar from '@/components/search/SearchFloatingBar';
import SearchModal, { type SearchDraft } from '@/components/search/SearchModal';
import SearchFiltersSheet from '@/components/search/SearchFiltersSheet';
import SearchResultsSheet, { type SheetPosition } from '@/components/search/SearchResultsSheet';
import SearchResultCard from '@/components/search/SearchResultCard';
import SearchMiniCard from '@/components/search/SearchMiniCard';
import SearchEmptyState from '@/components/search/SearchEmptyState';
import { useExploreSearch } from '@/hooks/useExploreSearch';
import { useAuth } from '@/contexts/AuthContext';
import { interactions } from '@/lib/api';
import { geocodeCity, resultKey, SPECIALTY_LABELS } from '@/lib/explore';
import type { ExploreResult, ExploreType } from '@/lib/explore';
import type { MapViewport } from '@/components/search/mapProvider';
import { getStoredLocation, requestBrowserGeolocation, storeLocation } from '@/hooks/useGeolocation';

const FRANCE_CENTER = { lat: 46.6, lng: 2.45 };

/** Un seul exemplaire de la carte doit vivre à la fois — le layout mobile et
 *  le layout desktop sont rendus conditionnellement, pas masqués en CSS. */
function subscribeToDesktop(cb: () => void) {
  const mq = window.matchMedia('(min-width: 768px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false
  );
}

function RechercheContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const explore = useExploreSearch(userLocation);
  const { filters, setFilters } = explore;

  const [selectedKey, setSelectedKey]   = useState<string | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [sheetPos, setSheetPos]         = useState<SheetPosition>('half');
  const [modalOpen, setModalOpen]       = useState(false);
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [mapMoved, setMapMoved]         = useState(false);
  const [favoriteIds, setFavoriteIds]   = useState<Set<number> | null>(null);

  const mapRef      = useRef<SearchMapHandle>(null);
  const viewportRef = useRef<MapViewport | null>(null);
  const autoFitRef  = useRef(true);
  const initRef     = useRef(false);

  // ── Init : position stockée + paramètres d'URL entrants ──────────────────
  // Micro-tâche : lecture d'un système externe (localStorage/URL) une seule
  // fois après le mount, sans setState synchrone dans le corps de l'effet.
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    queueMicrotask(() => {
      const patch: Parameters<typeof setFilters>[0] = {};

      const stored = getStoredLocation();
      if (stored) {
        setUserLocation({ lat: stored.latitude, lng: stored.longitude });
        patch.useMyPosition = true;
      }

      const q         = searchParams.get('q');
      const specialty = searchParams.get('specialty');
      const cityParam = searchParams.get('city');

      if (q) patch.q = q;
      if (specialty && SPECIALTY_LABELS[specialty]) patch.specialties = [specialty];

      setFilters(patch);

      if (cityParam) {
        geocodeCity(cityParam).then((geo) => {
          if (geo) setFilters({ city: geo.city, cityCoords: { lat: geo.lat, lng: geo.lng }, useMyPosition: false });
        }).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Favoris (profils indépendants uniquement) ─────────────────────────────
  useEffect(() => {
    if (!user) return;
    interactions.savedList()
      .then((list) => setFavoriteIds(new Set(list.map((h) => h.id))))
      .catch(() => setFavoriteIds(new Set()));
  }, [user]);

  // Sans compte connecté, les favoris sont simplement indisponibles
  const effectiveFavoriteIds = user ? favoriteIds : null;

  const toggleFavorite = useCallback((r: ExploreResult) => {
    if (favoriteIds === null) return;
    const isFav = favoriteIds.has(r.id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(r.id); else next.add(r.id);
      return next;
    });
    (isFav ? interactions.unsave(r.id) : interactions.save(r.id)).catch(() => {
      // Rollback si l'API échoue
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(r.id); else next.delete(r.id);
        return next;
      });
    });
  }, [favoriteIds]);

  // ── Auto-cadrage de la carte sur les nouveaux résultats ───────────────────
  // Uniquement des appels au système externe (la carte) — pas de setState ici,
  // le bouton "Rechercher dans cette zone" est réinitialisé dans les handlers.
  useEffect(() => {
    if (explore.isLoading || !autoFitRef.current) return;
    const located = explore.results.filter((r) => r.has_coords);
    if (located.length > 0) {
      mapRef.current?.fitToResults();
      autoFitRef.current = false;
    }
     
  }, [explore.results, explore.isLoading]);

  // ── Sélection marqueur / carte ────────────────────────────────────────────
  const resultByKey = useMemo(() => {
    const m = new Map<string, ExploreResult>();
    explore.results.forEach((r) => m.set(resultKey(r), r));
    return m;
  }, [explore.results]);

  const selectedResult = selectedKey ? resultByKey.get(selectedKey) ?? null : null;

  const handleMarkerSelect = useCallback((key: string | null) => {
    setSelectedKey(key);
    setHighlightKey(null);
    if (key) {
      setSheetPos('peek');
      const r = explore.results.find((x) => resultKey(x) === key);
      if (r?.has_coords && r.latitude != null && r.longitude != null) {
        mapRef.current?.setCenter({ lat: r.latitude, lng: r.longitude });
      }
    }
     
  }, [explore.results]);

  const handleUserMoved = useCallback((vp: MapViewport) => {
    viewportRef.current = vp;
    setMapMoved(true);
  }, []);

  const handleSearchInArea = useCallback(() => {
    const vp = viewportRef.current ?? mapRef.current?.getViewport();
    if (!vp) return;
    autoFitRef.current = false;
    explore.searchInArea(vp.bounds);
    setMapMoved(false);
    setSelectedKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explore.searchInArea]);

  // ── Modale Recherche ──────────────────────────────────────────────────────
  const requestGeo = useCallback(async (): Promise<boolean> => {
    try {
      const coords = await requestBrowserGeolocation();
      storeLocation({ latitude: coords.latitude, longitude: coords.longitude });
      setUserLocation({ lat: coords.latitude, lng: coords.longitude });
      return true;
    } catch {
      return false;
    }
  }, []);

  const modalDraft: SearchDraft = {
    q: filters.q,
    specialties: filters.specialties,
    city: filters.city,
    cityCoords: filters.cityCoords,
    useMyPosition: filters.useMyPosition,
    radius: filters.radius,
  };

  const handleModalApply = useCallback((draft: SearchDraft) => {
    autoFitRef.current = true;
    setMapMoved(false);
    setFilters({
      q: draft.q,
      specialties: draft.specialties,
      city: draft.city,
      cityCoords: draft.cityCoords,
      useMyPosition: draft.useMyPosition,
      radius: draft.radius,
    });
    setModalOpen(false);
    setSelectedKey(null);
    setSheetPos('half');
  }, [setFilters]);

  // ── Libellés ──────────────────────────────────────────────────────────────
  const barTitle =
    filters.q ? filters.q :
    filters.specialties.length === 1 ? (SPECIALTY_LABELS[filters.specialties[0]] ?? filters.specialties[0]) :
    filters.specialties.length > 1 ? `${filters.specialties.length} spécialités` :
    'Toutes les prestations';

  const locationLabel = explore.bbox
    ? 'Zone de la carte'
    : filters.useMyPosition && userLocation
      ? 'Position actuelle'
      : filters.city ?? 'Toute la France';

  const activeFiltersCount = [
    filters.minRating > 0,
    filters.type !== 'all',
    filters.specialties.length > 0,
    filters.sort !== 'relevance',
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0 || !!filters.q;

  function emptyMessage(): string {
    if (explore.bbox) return 'Aucun professionnel dans cette zone de la carte.';
    if (explore.center && filters.radius != null) {
      return `Aucun professionnel dans un rayon de ${filters.radius} km autour de ${locationLabel}.`;
    }
    if (filters.q) return `Aucun résultat pour "${filters.q}".`;
    if (filters.specialties.length > 0) return 'Aucun spécialiste pour ces critères pour le moment.';
    return 'Aucun professionnel disponible pour le moment.';
  }

  // Résultat sélectionné remonté en tête de liste
  const displayResults = useMemo(() => {
    if (!selectedKey) return explore.results;
    const sel = explore.results.filter((r) => resultKey(r) === selectedKey);
    if (sel.length === 0) return explore.results;
    return [...sel, ...explore.results.filter((r) => resultKey(r) !== selectedKey)];
  }, [explore.results, selectedKey]);

  const unlocatedCount = explore.results.filter((r) => !r.has_coords).length;

  // ── Sous-composants de contenu ────────────────────────────────────────────

  const typeChips: { label: string; value: ExploreType; count?: number; icon: React.ReactNode }[] = [
    { label: 'Tous',      value: 'all',         count: explore.counts?.all,          icon: <LayoutGrid size={12} /> },
    { label: 'Coiffeurs', value: 'hairdresser', count: explore.counts?.hairdressers, icon: <User size={12} /> },
    { label: 'Salons',    value: 'salon',       count: explore.counts?.salons,       icon: <Building2 size={12} /> },
  ];

  const listHeader = (
    <div className="px-4 pb-2.5">
      <p className="text-[12px] text-neutral-400 mb-2.5">
        {explore.isLoading
          ? 'Recherche en cours...'
          : `${explore.total} résultat${explore.total > 1 ? 's' : ''}${explore.bbox ? ' dans cette zone' : ` · ${locationLabel}`}`}
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {typeChips.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilters({ type: c.value })}
            className={`flex-shrink-0 flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-full border transition-all ${
              filters.type === c.value
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-600 border-neutral-200'
            }`}
          >
            {c.icon}
            {c.label}
            {c.count != null && (
              <span className={`text-[10px] font-normal ${filters.type === c.value ? 'text-neutral-300' : 'text-neutral-400'}`}>{c.count}</span>
            )}
          </button>
        ))}
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex-shrink-0 flex items-center gap-1 text-[12px] font-semibold px-3.5 py-2 rounded-full border bg-white text-neutral-600 border-neutral-200"
        >
          Trier
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  );

  const listContent = (
    <>
      {explore.isLoading && (
        <div className="space-y-3 pt-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3.5 p-3 rounded-2xl border border-neutral-100">
              <div className="w-[92px] h-[92px] rounded-xl bg-neutral-100 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-2.5 bg-neutral-100 rounded-full animate-pulse w-1/4" />
                <div className="h-3.5 bg-neutral-100 rounded-full animate-pulse w-2/3" />
                <div className="h-3 bg-neutral-100 rounded-full animate-pulse w-1/2" />
                <div className="h-3 bg-neutral-100 rounded-full animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!explore.isLoading && explore.error && (
        <SearchEmptyState
          variant="error"
          message="Impossible de charger les résultats. Vérifiez votre connexion et réessayez."
          radius={filters.radius}
          hasActiveFilters={hasActiveFilters}
          onWidenRadius={(r) => setFilters({ radius: r })}
          onClearSpecialties={null}
          onReset={explore.resetFilters}
          onRetry={explore.retry}
        />
      )}

      {!explore.isLoading && !explore.error && displayResults.length === 0 && (
        <SearchEmptyState
          variant="empty"
          message={emptyMessage()}
          radius={explore.center ? filters.radius : null}
          hasActiveFilters={hasActiveFilters}
          onWidenRadius={(r) => { autoFitRef.current = true; setMapMoved(false); setFilters({ radius: r }); }}
          onClearSpecialties={filters.specialties.length > 0 ? () => setFilters({ specialties: [] }) : null}
          onReset={() => { autoFitRef.current = true; setMapMoved(false); explore.resetFilters(); }}
        />
      )}

      {!explore.isLoading && !explore.error && displayResults.length > 0 && (
        <div className="space-y-2.5 pt-1">
          {displayResults.map((r) => {
            const key = resultKey(r);
            return (
              <div key={key} onMouseEnter={() => setHighlightKey(key)} onMouseLeave={() => setHighlightKey(null)}>
                <SearchResultCard
                  result={r}
                  selected={key === selectedKey}
                  isFavorite={r.type === 'hairdresser' && effectiveFavoriteIds !== null ? effectiveFavoriteIds.has(r.id) : null}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            );
          })}

          {unlocatedCount > 0 && (
            <p className="flex items-center gap-1.5 text-[11px] text-neutral-400 px-1 pt-1">
              <MapPinOff size={11} className="flex-shrink-0" />
              {unlocatedCount === 1
                ? '1 professionnel sans adresse localisée n\'apparaît pas sur la carte.'
                : `${unlocatedCount} professionnels sans adresse localisée n'apparaissent pas sur la carte.`}
            </p>
          )}

          {explore.hasMore && (
            <button
              onClick={() => explore.loadMore()}
              className="w-full py-3 text-[13px] font-semibold text-neutral-700 border border-neutral-200 rounded-2xl hover:border-neutral-400 transition-colors"
            >
              Voir plus de résultats
            </button>
          )}
        </div>
      )}
    </>
  );

  const mapElement = (
    <SearchMap
      ref={mapRef}
      results={explore.results}
      selectedKey={selectedKey ?? highlightKey}
      onSelect={handleMarkerSelect}
      onUserMoved={handleUserMoved}
      userLocation={filters.useMyPosition ? userLocation : null}
      initialCenter={userLocation ?? filters.cityCoords ?? FRANCE_CENTER}
      initialZoom={userLocation || filters.cityCoords ? 11 : 5.5}
      className="absolute inset-0 z-0"
    />
  );

  const overlays = (
    <>
      {/* Barre flottante */}
      <div className="absolute top-3 inset-x-3 z-20">
        <SearchFloatingBar
          title={barTitle}
          subtitle={locationLabel}
          onOpenSearch={() => setModalOpen(true)}
          onOpenFilters={() => setFiltersOpen(true)}
          activeFiltersCount={activeFiltersCount}
        />
      </div>

      {/* Rechercher dans cette zone */}
      {mapMoved && !explore.isLoading && (
        <div className="absolute top-[72px] inset-x-0 z-20 flex justify-center pointer-events-none">
          <button
            onClick={handleSearchInArea}
            className="pointer-events-auto flex items-center gap-1.5 bg-neutral-900 text-white text-[12px] font-semibold px-4 py-2.5 rounded-full shadow-lg"
          >
            <RefreshCw size={12} />
            Rechercher dans cette zone
          </button>
        </div>
      )}

      {explore.isLoading && (
        <div className="absolute top-[72px] inset-x-0 z-20 flex justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 bg-white text-neutral-500 text-[12px] font-medium px-3.5 py-2 rounded-full shadow-md border border-neutral-100">
            <Loader2 size={12} className="animate-spin" />
            Recherche...
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <TopNav />

      <main className="pt-content-mobile md:pt-[60px]">

        {!isDesktop ? (
          /* ── MOBILE : carte plein cadre + bottom sheet ── */
          <div className="search-stage relative overflow-hidden">
            {mapElement}
            {overlays}

            {/* Mini fiche marqueur */}
            {selectedResult && (
              <div className="absolute inset-x-3 z-20" style={{ bottom: '128px' }}>
                <SearchMiniCard result={selectedResult} onClose={() => setSelectedKey(null)} />
              </div>
            )}

            <SearchResultsSheet position={sheetPos} onPositionChange={setSheetPos} header={listHeader}>
              {listContent}
            </SearchResultsSheet>
          </div>
        ) : (
          /* ── DESKTOP : deux colonnes, liste + carte sticky ── */
          <div className="search-stage grid grid-cols-[460px_1fr]">
            <div className="overflow-y-auto border-r border-neutral-100">
              <div className="pt-4">
                {listHeader}
              </div>
              <div className="px-4 pb-10">
                {listContent}
              </div>
            </div>
            <div className="relative overflow-hidden">
              {mapElement}
              {overlays}
              {selectedResult && (
                <div className="absolute bottom-5 left-5 z-20 w-[360px]">
                  <SearchMiniCard result={selectedResult} onClose={() => setSelectedKey(null)} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
      <ReviewPromptTrigger />
      <GeoPermissionModal />

      <SearchModal
        key={modalOpen ? 'modal-open' : 'modal-closed'}
        open={modalOpen}
        initial={modalDraft}
        hasGeolocation={userLocation !== null}
        onRequestGeolocation={requestGeo}
        onClose={() => setModalOpen(false)}
        onApply={handleModalApply}
      />

      <SearchFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={{
          type: filters.type,
          sort: filters.sort,
          minRating: filters.minRating,
          radius: filters.radius,
          specialties: filters.specialties,
        }}
        onChange={(patch) => {
          const mapped: Partial<typeof filters> = {};
          if (patch.type !== undefined)        mapped.type = patch.type;
          if (patch.sort !== undefined)        mapped.sort = patch.sort;
          if (patch.minRating !== undefined)   mapped.minRating = patch.minRating;
          if (patch.radius !== undefined)      { mapped.radius = patch.radius; autoFitRef.current = true; setMapMoved(false); }
          if (patch.specialties !== undefined) mapped.specialties = patch.specialties;
          setFilters(mapped);
        }}
        onReset={() => { autoFitRef.current = true; setMapMoved(false); explore.resetFilters(); }}
        resultsCount={explore.total}
        counts={explore.counts}
        hasLocation={explore.center !== null || explore.bbox !== null}
        locationLabel={locationLabel}
        isLoading={explore.isLoading}
      />
    </>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={
      <>
        <TopNav />
        <main className="pt-content-mobile md:pt-[60px]">
          <div className="search-stage relative overflow-hidden bg-neutral-50">
            <div className="absolute top-3 inset-x-3">
              <div className="h-[58px] bg-white rounded-full shadow-lg animate-pulse" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[45%] bg-white rounded-t-3xl p-4">
              <div className="flex justify-center pb-3">
                <div className="w-10 h-1.5 bg-neutral-200 rounded-full" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3.5 p-3 rounded-2xl border border-neutral-100">
                    <div className="w-[92px] h-[92px] rounded-xl bg-neutral-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-neutral-100 rounded-full animate-pulse w-2/3" />
                      <div className="h-3 bg-neutral-100 rounded-full animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <BottomNav />
      </>
    }>
      <RechercheContent />
    </Suspense>
  );
}
