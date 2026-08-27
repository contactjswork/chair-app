'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, LayoutGrid, Loader2, LocateFixed, MapPinOff, RefreshCw, SlidersHorizontal, User, X } from 'lucide-react';
import TopNav from '@/components/layout/TopNav';
import BottomNav from '@/components/layout/BottomNav';
import ReviewPromptTrigger from '@/components/ui/ReviewPromptTrigger';
import GeoPermissionModal from '@/components/ui/GeoPermissionModal';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/Badge';
import SearchMap, { type SearchMapHandle } from '@/components/search/SearchMap';
import SearchFloatingBar from '@/components/search/SearchFloatingBar';
import SearchModal, { type SearchDraft } from '@/components/search/SearchModal';
import SearchFiltersSheet from '@/components/search/SearchFiltersSheet';
import SearchResultsSheet, { type SheetPosition } from '@/components/search/SearchResultsSheet';
import SearchResultCard from '@/components/search/SearchResultCard';
import SearchMiniCard from '@/components/search/SearchMiniCard';
import SearchEmptyState from '@/components/search/SearchEmptyState';
import SearchResultSkeleton from '@/components/search/SearchResultSkeleton';
import SearchFallbackBanner from '@/components/search/SearchFallbackBanner';
import { useExploreSearch } from '@/hooks/useExploreSearch';
import { useAuth } from '@/contexts/AuthContext';
import { interactions } from '@/lib/api';
import { geocodeCity, resultKey, SPECIALTY_LABELS } from '@/lib/explore';
import { getLiveSpecialtyLabels } from '@/lib/specialties';
import type { ExploreResult, ExploreType } from '@/lib/explore';
import type { MapViewport } from '@/components/search/mapProvider';
import { getStoredLocation, requestBrowserGeolocation, storeLocation } from '@/hooks/useGeolocation';

const FRANCE_CENTER = { lat: 46.6, lng: 2.45 };

/** Libellés courts des tris, pour les chips de filtres actifs de la liste. */
const SORT_LABELS: Record<string, string> = {
  relevance: 'Pertinence',
  distance:  'Les plus proches',
  rating:    'Les mieux notés',
  popular:   'Les plus demandés',
};

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
  // Libellés live (DB, administrables sans build) — repli sur SPECIALTY_LABELS
  // tant que le fetch n'a pas résolu / si l'API tombe.
  const [liveLabels, setLiveLabels] = useState<Record<string, string>>(SPECIALTY_LABELS);

  useEffect(() => {
    let cancelled = false;
    getLiveSpecialtyLabels().then((map) => { if (!cancelled) setLiveLabels(map); });
    return () => { cancelled = true; };
  }, []);

  // Préchauffage carte Apple : lance le script + le jeton dès l'affichage de
  // la page, sans attendre que le composant carte soit monté (celui-ci charge
  // son adaptateur en import dynamique, donc plus tard). Import dynamique
  // aussi ici pour ne rien ajouter au bundle initial.
  useEffect(() => {
    import('@/components/search/mapkitAdapter')
      .then((m) => m.warmUpMapKit())
      .catch(() => { /* MapKit indisponible : repli Leaflet, rien à faire */ });
  }, []);

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

  // Repli ville réelle du profil — si ni le GPS appareil ni un ?city= d'URL
  // n'ont déjà positionné la carte, on utilise la ville stockée de
  // l'utilisateur plutôt que de rester zoomé sur toute la France. `user` se
  // charge de façon asynchrone (AuthContext) donc distinct de l'effet d'init.
  const profileGeoAppliedRef = useRef(false);
  useEffect(() => {
    if (profileGeoAppliedRef.current) return;
    if (userLocation || searchParams.get('city')) { profileGeoAppliedRef.current = true; return; }
    if (user?.latitude == null || user?.longitude == null) return;

    // Conversion explicite : les colonnes DECIMAL de `users` remontent en
    // CHAÎNES ("48.5734000") tant qu'elles ne sont pas castées côté modèle.
    // Apple Plans refuse une chaîne et lève « `latitude` is not a number »,
    // ce qui faisait planter toute la page pour un utilisateur connecté ayant
    // une ville — d'où un bug qui n'apparaissait jamais hors connexion.
    const lat = Number(user.latitude);
    const lng = Number(user.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    profileGeoAppliedRef.current = true;
    const geo = { lat, lng };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserLocation(geo);
    setFilters({ useMyPosition: true });
    // La carte est déjà montée (sur FRANCE_CENTER) le temps que le profil se
    // charge — initialCenter ne joue qu'au premier montage, il faut donc
    // recentrer explicitement une fois la position connue.
    mapRef.current?.setCenter(geo, 11);
  }, [user, userLocation, searchParams, setFilters]);

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

  // ── Recentrage carte sur ma position ──────────────────────────────────────
  // Ne recentre QUE la carte — ne relance jamais la recherche ni ne change le
  // filtre de zone : l'utilisateur peut vouloir juste se repérer sans perdre
  // les résultats déjà affichés (ex : il a choisi une autre ville).
  const [locatingMe, setLocatingMe] = useState(false);
  // Refus (ou indisponibilité) de la géolocalisation : sans ce message, le tap
  // sur "Recentrer sur ma position" ne produisait RIEN de visible — un bouton
  // muet. On explique et on oriente vers la recherche par ville.
  const [geoNotice, setGeoNotice] = useState<string | null>(null);
  const geoNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recenterOnMe = useCallback(async () => {
    if (userLocation) {
      mapRef.current?.setCenter(userLocation, 14);
      return;
    }
    setLocatingMe(true);
    const ok = await requestGeo();
    setLocatingMe(false);
    if (ok) {
      const stored = getStoredLocation();
      if (stored) mapRef.current?.setCenter({ lat: stored.latitude, lng: stored.longitude }, 14);
    } else {
      setGeoNotice('Position indisponible. Autorise la localisation dans les réglages, ou cherche par ville.');
      if (geoNoticeTimer.current) clearTimeout(geoNoticeTimer.current);
      geoNoticeTimer.current = setTimeout(() => setGeoNotice(null), 5000);
    }
  }, [userLocation, requestGeo]);

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
    filters.specialties.length === 1 ? (liveLabels[filters.specialties[0]] ?? filters.specialties[0]) :
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
    { label: 'Tous',      value: 'all',         count: explore.counts?.all,          icon: <LayoutGrid size={13} /> },
    { label: 'Coiffeurs', value: 'hairdresser', count: explore.counts?.hairdressers, icon: <User size={13} /> },
    { label: 'Salons',    value: 'salon',       count: explore.counts?.salons,       icon: <Building2 size={13} /> },
  ];

  /** Filtres actifs retirables directement depuis la liste — jusqu'ici il
   *  fallait rouvrir la sheet pour enlever ne serait-ce qu'une spécialité. */
  const activeChips: { key: string; label: string; clear: () => void }[] = [
    ...filters.specialties.map((slug) => ({
      key: `spec-${slug}`,
      label: liveLabels[slug] ?? slug,
      clear: () => setFilters({ specialties: filters.specialties.filter((s) => s !== slug) }),
    })),
    ...(filters.minRating > 0
      ? [{ key: 'rating', label: `${String(filters.minRating).replace('.', ',')}+`, clear: () => setFilters({ minRating: 0 }) }]
      : []),
    ...(filters.sort !== 'relevance'
      ? [{ key: 'sort', label: SORT_LABELS[filters.sort], clear: () => setFilters({ sort: 'relevance' }) }]
      : []),
  ];

  const FiltersButton = activeFiltersCount > 0 ? PrimaryButton : SecondaryButton;

  const listHeader = (
    <div className="px-4 pb-3">
      {/* L'information principale de l'écran redevient la plus lisible :
          avant, le nombre de résultats était en 12px neutral-400, soit le
          texte le plus effacé de la page. */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-[15px] font-bold text-neutral-900 tracking-[-0.01em] leading-none">
          {explore.isLoading
            ? 'Recherche…'
            : `${explore.total} résultat${explore.total > 1 ? 's' : ''}`}
        </p>
        <p className="text-[11.5px] text-neutral-400 truncate min-w-0">
          {explore.bbox ? 'dans cette zone' : locationLabel}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <FiltersButton
          size="sm"
          onClick={() => setFiltersOpen(true)}
          icon={<SlidersHorizontal size={13} />}
          className="flex-shrink-0"
        >
          Filtres{activeFiltersCount > 0 ? ` · ${activeFiltersCount}` : ''}
        </FiltersButton>

        <span className="w-px h-5 bg-neutral-200 flex-shrink-0" />

        {/* Rail horizontal : la zone de drag de la sheet doit ignorer ce
            conteneur, sinon `touch-action: none` empêche tout scroll latéral
            au doigt — les chips au-delà de "Salons" étaient inatteignables. */}
        <div
          data-sheet-nodrag
          style={{ touchAction: 'pan-x' }}
          className="flex gap-2 overflow-x-auto no-scrollbar -mr-4 pr-4"
        >
          {typeChips.map((c) => (
            <FilterChip
              key={c.value}
              active={filters.type === c.value}
              onClick={() => setFilters({ type: c.value })}
            >
              {c.icon}
              {c.label}
              {c.count != null && (
                <span className={`text-[11px] font-normal tabular-nums ${filters.type === c.value ? 'text-white/60' : 'text-neutral-400'}`}>
                  {c.count}
                </span>
              )}
            </FilterChip>
          ))}

          {activeChips.map((c) => (
            <FilterChip key={c.key} active onClick={c.clear} aria-label={`Retirer le filtre ${c.label}`}>
              {c.label}
              <X size={12} className="text-neutral-400" />
            </FilterChip>
          ))}
        </div>
      </div>
    </div>
  );

  const listContent = (
    <>
      {explore.isLoading && <SearchResultSkeleton rows={5} />}

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
        <div className="space-y-2">
          <SearchFallbackBanner
            fallback={explore.fallback}
            specialtyRelaxed={explore.specialtyRelaxed}
            specialtyLabel={
              filters.specialties.length === 1
                ? (liveLabels[filters.specialties[0]] ?? filters.specialties[0])
                : filters.specialties.length > 1 ? `${filters.specialties.length} spécialités` : null
            }
            requestedRadius={filters.radius}
          />
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
            <p className="flex items-start gap-1.5 text-[11px] text-neutral-400 px-1 pt-2 leading-relaxed">
              <MapPinOff size={11} className="flex-shrink-0 mt-0.5" />
              {unlocatedCount === 1
                ? '1 professionnel sans adresse localisée n\'apparaît pas sur la carte.'
                : `${unlocatedCount} professionnels sans adresse localisée n'apparaissent pas sur la carte.`}
            </p>
          )}

          {explore.hasMore && (
            <div className="pt-2">
              <SecondaryButton onClick={() => explore.loadMore()} fullWidth>
                Voir plus de résultats
              </SecondaryButton>
            </div>
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
        />
      </div>

      {/* Rechercher dans cette zone */}
      {mapMoved && !explore.isLoading && (
        <div className="absolute top-[72px] inset-x-0 z-20 flex justify-center pointer-events-none">
          <button
            onClick={handleSearchInArea}
            className="pointer-events-auto flex items-center gap-1.5 bg-neutral-900 text-white text-[12px] font-semibold px-4 h-9 rounded-full transition-transform active:scale-95"
            style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.18)' }}
          >
            <RefreshCw size={12} />
            Rechercher dans cette zone
          </button>
        </div>
      )}

      {explore.isLoading && (
        <div className="absolute top-[72px] inset-x-0 z-20 flex justify-center pointer-events-none">
          <div
            className="flex items-center gap-1.5 bg-white text-neutral-500 text-[12px] font-medium px-3.5 h-9 rounded-full border border-neutral-100"
            style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.07)' }}
          >
            <Loader2 size={12} className="animate-spin" />
            Recherche…
          </div>
        </div>
      )}

      {/* Géoloc refusée / indisponible — retour visible, sinon le bouton est muet. */}
      {geoNotice && (
        <div className="absolute top-[128px] inset-x-3 z-20 flex justify-center pointer-events-none">
          <p
            className="bg-neutral-900 text-white text-[12px] font-medium px-4 py-2.5 rounded-2xl text-center leading-snug"
            style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.18)' }}
            role="status"
          >
            {geoNotice}
          </p>
        </div>
      )}

      {/* Recentrer sur ma position — placé sous la barre flottante, à droite,
          pour ne jamais chevaucher la mini fiche (pleine largeur, en bas). */}
      <div className="absolute top-[76px] right-3 z-20">
        <button
          onClick={recenterOnMe}
          disabled={locatingMe}
          aria-label="Recentrer sur ma position"
          className="flex items-center justify-center w-11 h-11 rounded-full bg-white border border-neutral-100 text-neutral-700 transition-transform active:scale-90 disabled:opacity-50"
          style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.1)' }}
        >
          {locatingMe ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}
        </button>
      </div>
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
              <div className="h-[58px] bg-white rounded-full border border-neutral-100" />
            </div>
            {/* Même géométrie que la vraie sheet (rayon, ombre, poignée) pour
                qu'il n'y ait aucun saut visuel à l'hydratation. */}
            <div
              className="absolute inset-x-0 bottom-0 h-[48%] bg-white rounded-t-3xl px-4 pb-4"
              style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}
            >
              <div className="flex justify-center pt-3 pb-3">
                <div className="w-9 h-1 bg-neutral-200 rounded-full" />
              </div>
              <SearchResultSkeleton rows={3} />
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
