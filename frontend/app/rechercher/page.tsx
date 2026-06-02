'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import HairdresserCard from '@/components/ui/HairdresserCard';
import type { ApiHairdresserProfile, ApiSpecialty, ApiSearchSuggestion } from '@/lib/types';
import { search as searchApi } from '@/lib/api';
import { getStoredLocation } from '@/hooks/useGeolocation';
import {
  Search, X, SlidersHorizontal, MapPin, Star, Scissors, User,
  Navigation, ArrowUpDown, RotateCcw, Loader2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ─── Constantes ─────────────────────────────────────────────────────────────

const SPECIALTY_ORDER = [
  'balayage', 'barber', 'coupe-femme', 'coupe-homme', 'boucles',
  'blond', 'coloration', 'ombre-hair', 'lissage', 'extensions',
  'hair-contouring', 'mariage',
];

const MIN_RATING_OPTIONS = [
  { label: 'Toutes', value: 0 },
  { label: '4+',     value: 4 },
  { label: '4.5+',   value: 4.5 },
];

// 999 = pas de filtre rayon (Toute la France)
const RADIUS_OPTIONS = [
  { label: '5 km',            value: 5 },
  { label: '10 km',           value: 10 },
  { label: '20 km',           value: 20 },
  { label: '50 km',           value: 50 },
  { label: 'Toute la France', value: 999 },
];

const SORT_OPTIONS = [
  { label: 'Pertinence',    value: 'relevance' },
  { label: 'Distance',      value: 'distance' },
  { label: 'Mieux notés',   value: 'rating' },
  { label: 'Plus demandés', value: 'popular' },
];

const SUGGESTION_ICON: Record<string, React.ReactNode> = {
  specialty:   <Scissors size={13} className="text-neutral-400" />,
  hairdresser: <User     size={13} className="text-neutral-400" />,
  city:        <MapPin   size={13} className="text-neutral-400" />,
  location:    <Navigation size={13} className="text-neutral-400" />,
  service:     <Scissors size={13} className="text-neutral-400" />,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function extractCities(hairdressers: ApiHairdresserProfile[]): string[] {
  const cities = hairdressers.map((h) => h.city).filter((c): c is string => !!c);
  return [...new Set(cities)].slice(0, 5);
}

// ─── Types internes ──────────────────────────────────────────────────────────

interface GeoCenter {
  lat:     number;
  lng:     number;
  display: string;    // nom affiché ("Haguenau", "Ma position")
  source:  'gps' | 'city' | 'city-partial';
}

type HWithDist = ApiHairdresserProfile & { distance_km?: number };

// ─── Composant principal ─────────────────────────────────────────────────────

function RechercherContent() {
  const searchParams = useSearchParams();

  // ── Filtres ────────────────────────────────────────────────────────────────
  const [query, setQuery]                         = useState(() => searchParams.get('q') ?? '');
  const [cityInput, setCityInput]                 = useState(() => searchParams.get('city') ?? '');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(() => searchParams.get('specialty'));
  const [minRating, setMinRating]                 = useState(0);
  const [sortBy, setSortBy]                       = useState('relevance');
  const [radius, setRadius]                       = useState(999);   // 999 = pas de filtre (défaut)

  // ── Données ───────────────────────────────────────────────────────────────
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>([]);
  const [specialties, setSpecialties]   = useState<ApiSpecialty[]>([]);
  const [total, setTotal]               = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [showFilters, setShowFilters]   = useState(false);

  // ── Centre géographique pour les recherches par rayon ─────────────────────
  // Peut venir de : GPS stocké  OU  ville géocodée
  const [geoCenter, setGeoCenter]       = useState<GeoCenter | null>(null);
  const [geocoding, setGeocoding]       = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // ── Suggestions autocomplete ──────────────────────────────────────────────
  const [suggestions, setSuggestions]         = useState<ApiSearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx]             = useState(-1);

  const debounceRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBarRef       = useRef<HTMLDivElement>(null);

  // ── Init : spécialités + position GPS ────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/specialties`).then((r) => r.json()).then(setSpecialties).catch(() => {});

    const loc = getStoredLocation();
    if (loc) {
      setGeoCenter({ lat: loc.latitude, lng: loc.longitude, display: 'Ma position', source: 'gps' });
      setSortBy('distance');
    }
  }, []);

  // ── Géocodage de la ville saisie ──────────────────────────────────────────
  // Déclenché dès que cityInput change. Si la ville est géocodée, elle remplace le GPS comme centre.
  useEffect(() => {
    if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
    setGeocodeError(null);

    if (!cityInput.trim()) {
      // Ville vidée : revenir au GPS si disponible, sinon pas de centre
      const loc = getStoredLocation();
      if (loc) {
        setGeoCenter({ lat: loc.latitude, lng: loc.longitude, display: 'Ma position', source: 'gps' });
      } else {
        setGeoCenter(null);
      }
      return;
    }

    // Attendre 600ms après la dernière frappe avant de géocoder
    geocodeDebounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res  = await fetch(`${API}/geocode?q=${encodeURIComponent(cityInput.trim())}`);
        const data = await res.json();
        if (res.ok && data.lat != null) {
          setGeoCenter({
            lat:     data.lat,
            lng:     data.lng,
            display: data.city,
            source:  'city',
          });
          setGeocodeError(null);
        } else {
          // Ville inconnue — centre inconnu, on garde le GPS si dispo
          const loc = getStoredLocation();
          if (loc) {
            setGeoCenter({ lat: loc.latitude, lng: loc.longitude, display: 'Ma position', source: 'gps' });
          } else {
            setGeoCenter(null);
          }
          if (cityInput.trim().length > 2) {
            setGeocodeError(`"${cityInput.trim()}" non reconnue — la recherche s'effectue sur toute la France.`);
          }
        }
      } catch {
        // Silencieux
      }
      setGeocoding(false);
    }, 600);

    return () => { if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current); };
  }, [cityInput]);


  // ── Suggestions autocomplete ──────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchApi.suggestions(query);
        setSuggestions(res.suggestions);
      } catch { setSuggestions([]); }
    }, 220);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Fermer suggestions au clic extérieur ─────────────────────────────────
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Logique de recherche
   *
   * Règle fondamentale :
   *   applyGeoFilter = geoCenter connu  ET  radius < 999
   *
   * Si applyGeoFilter :
   *   → envoie lat/lng/radius au backend (haversine)
   *   → NE PAS envoyer city (le filtre SQL LIKE cassait les villages)
   *   → tri distance backend déjà fait ; autres tris côté client sur résultats filtrés
   *
   * Sinon :
   *   → requête classique + city SQL LIKE si saisie
   *   → distance calculée côté client si geoCenter dispo (pour les cartes)
   *   → tri distance côté client si demandé
   */
  const doSearch = useCallback(async (
    q:         string,
    city:      string,
    specialty: string | null,
    rating:    number,
    sort:      string,
    r:         number,
    center:    GeoCenter | null,
  ) => {
    setIsLoading(true);
    try {
      const applyGeoFilter = center !== null && r < 999;

      let items: ApiHairdresserProfile[] = [];

      // ── Recherche full-text ──────────────────────────────────────────────
      if (q.trim()) {
        const data = await searchApi.query({
          q:          q.trim(),
          city:       (!applyGeoFilter && city.trim()) ? city.trim() : undefined,
          specialty:  specialty || undefined,
          min_rating: rating > 0 ? rating : undefined,
          lat:        applyGeoFilter ? center!.lat : undefined,
          lng:        applyGeoFilter ? center!.lng : undefined,
          radius:     applyGeoFilter ? r : undefined,
          per_page:   50,
        });
        items = data.data;

      // ── Filtres simples ──────────────────────────────────────────────────
      } else {
        const params = new URLSearchParams({ per_page: '50' });
        if (specialty) params.set('specialty', specialty);

        if (applyGeoFilter) {
          // Centre connu + rayon < 999 → backend haversine (pas de filtre city SQL)
          params.set('lat',    String(center!.lat));
          params.set('lng',    String(center!.lng));
          params.set('radius', String(r));
        } else {
          // Pas de filtre rayon → tri classique + city SQL si saisie
          if (city.trim()) params.set('city', city.trim());
          if (sort === 'popular') params.set('sort', 'popular');
          else                    params.set('sort', 'default');
        }

        const res  = await fetch(`${API}/hairdressers?${params}`);
        const data = await res.json();
        items = data.data ?? [];
      }

      // ── Distance côté client (quand pas de filtre geo, mais centre dispo) ─
      if (center !== null && !applyGeoFilter) {
        items = items.map((h) => {
          const hLat = h.latitude  != null ? parseFloat(String(h.latitude))  : null;
          const hLng = h.longitude != null ? parseFloat(String(h.longitude)) : null;
          if (hLat != null && hLng != null) {
            (h as HWithDist).distance_km = haversineKm(center.lat, center.lng, hLat, hLng);
          }
          return h;
        });
      }

      // ── Filtre note minimum ───────────────────────────────────────────────
      if (rating > 0) {
        items = items.filter((h) => h.reviews_count > 0 && parseFloat(h.avg_rating) >= rating);
      }

      // ── Tri côté client ───────────────────────────────────────────────────
      // • sort='distance' + applyGeoFilter → déjà trié par le backend
      // • sort='distance' + pas de filtre → tri par distance calculée côté client
      if (sort === 'rating') {
        items = [...items].sort((a, b) => parseFloat(b.avg_rating) - parseFloat(a.avg_rating));
      } else if (sort === 'popular') {
        items = [...items].sort((a, b) => {
          const sa = parseFloat(a.avg_rating) * a.reviews_count + a.followers_count + a.visits_count;
          const sb = parseFloat(b.avg_rating) * b.reviews_count + b.followers_count + b.visits_count;
          return sb - sa;
        });
      } else if (sort === 'distance' && center !== null && !applyGeoFilter) {
        items = [...items].sort((a, b) => {
          const da = (a as HWithDist).distance_km ?? Infinity;
          const db = (b as HWithDist).distance_km ?? Infinity;
          return da - db;
        });
      }

      setHairdressers(items);
      setTotal(items.length);
    } catch {
      setHairdressers([]);
      setTotal(0);
    }
    setIsLoading(false);
  }, []);

  // ── Déclenchement de la recherche ─────────────────────────────────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    // Ne pas lancer tant que le géocodage est en cours
    if (geocoding) return;
    const delay = query.trim() ? 350 : 0;
    searchDebounceRef.current = setTimeout(() => {
      doSearch(query, cityInput, selectedSpecialty, minRating, sortBy, radius, geoCenter);
    }, delay);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [query, cityInput, selectedSpecialty, minRating, sortBy, radius, geoCenter, geocoding, doSearch]);

  // ── Actions utilisateur ───────────────────────────────────────────────────

  function applySuggestion(s: ApiSearchSuggestion) {
    setShowSuggestions(false);
    setActiveIdx(-1);
    if (s.type === 'specialty' && s.slug) {
      setSelectedSpecialty(s.slug);
      setQuery('');
    } else if (s.type === 'city') {
      setCityInput(s.value);
      setQuery('');
    } else {
      setQuery(s.value);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown')                    { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp')                 { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); applySuggestion(suggestions[activeIdx]); }
    else if (e.key === 'Escape')                  { setShowSuggestions(false); setActiveIdx(-1); }
  }

  function resetAll() {
    setQuery('');
    setCityInput('');
    setSelectedSpecialty(null);
    setMinRating(0);
    setRadius(999);
    setGeocodeError(null);
    const loc = getStoredLocation();
    if (loc) {
      setGeoCenter({ lat: loc.latitude, lng: loc.longitude, display: 'Ma position', source: 'gps' });
      setSortBy('distance');
    } else {
      setGeoCenter(null);
      setSortBy('relevance');
    }
    setShowFilters(false);
  }

  // ── Dérivés ────────────────────────────────────────────────────────────────

  const specialtyMap       = Object.fromEntries(specialties.map((s) => [s.slug, s]));
  const orderedSpecialties = SPECIALTY_ORDER.map((sl) => specialtyMap[sl]).filter(Boolean);
  const suggestedCities    = extractCities(hairdressers);
  const hairdressersWD     = hairdressers as HWithDist[];

  const hasGeo          = geoCenter !== null;
  const radiusActive    = radius < 999;
  const applyGeoFilter  = hasGeo && radiusActive;

  const hasActiveFilters = !!(
    query.trim() || cityInput.trim() || selectedSpecialty || minRating > 0 || radiusActive
  );

  const activeFiltersCount = [
    cityInput.trim() ? 1 : 0,
    minRating > 0    ? 1 : 0,
    radiusActive     ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function emptyMessage(): string {
    const loc = cityInput.trim() || geoCenter?.display || 'votre position';
    if (applyGeoFilter) {
      if (selectedSpecialty) {
        const s = specialtyMap[selectedSpecialty];
        return `Aucun spécialiste ${s?.name ?? ''} dans un rayon de ${radius} km autour de ${loc}.`;
      }
      return `Aucun coiffeur trouvé dans un rayon de ${radius} km autour de ${loc}.`;
    }
    if (query)              return `Aucun coiffeur trouvé pour "${query}".`;
    if (selectedSpecialty && cityInput.trim()) {
      const s = specialtyMap[selectedSpecialty];
      return `Aucun spécialiste ${s?.name ?? ''} à ${cityInput.trim()}.`;
    }
    if (selectedSpecialty)  return `Aucun coiffeur spécialisé en ${specialtyMap[selectedSpecialty]?.name ?? ''}.`;
    if (cityInput.trim())   return `Aucun coiffeur à ${cityInput.trim()} pour l'instant.`;
    return "Aucun coiffeur disponible pour l'instant.";
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">

        {/* ━━━ HEADER STICKY ━━━ */}
        <div className="sticky top-0 z-20 bg-white">

          {/* Barre de recherche + bouton filtres */}
          <div className="flex gap-2 px-4 pt-4 pb-2" ref={searchBarRef}>
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Balayage, barber, blond polaire, Lyon..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); setActiveIdx(-1); }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onKeyDown={handleSearchKeyDown}
                autoComplete="off"
                className="w-full pl-9 pr-8 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X size={15} />
                </button>
              )}

              {/* Dropdown suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50">
                  {suggestions.map((s, i) => (
                    <button
                      key={`${s.type}-${s.value}-${i}`}
                      onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors
                        ${i === activeIdx ? 'bg-neutral-50' : 'hover:bg-neutral-50'}
                        ${i < suggestions.length - 1 ? 'border-b border-neutral-50' : ''}`}
                    >
                      <span className="flex-shrink-0">{SUGGESTION_ICON[s.type] ?? <Search size={13} className="text-neutral-400" />}</span>
                      <span className="text-neutral-900 font-medium">{s.label}</span>
                      <span className="ml-auto text-[10px] font-semibold tracking-wider uppercase text-neutral-300 flex-shrink-0">
                        {s.type === 'specialty' ? 'Spécialité' : s.type === 'hairdresser' ? 'Coiffeur' : s.type === 'city' ? 'Ville' : s.type === 'location' ? 'Région' : 'Service'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton filtres */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`relative flex items-center gap-1.5 px-3.5 py-3 rounded-2xl border text-sm font-medium transition-all flex-shrink-0 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <SlidersHorizontal size={15} />
              {activeFiltersCount > 0 && (
                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${showFilters ? 'bg-white text-neutral-900' : 'bg-neutral-700 text-white'}`}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Pills spécialités */}
          {orderedSpecialties.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
              {orderedSpecialties.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => setSelectedSpecialty(s.slug === selectedSpecialty ? null : s.slug)}
                  className={`flex-shrink-0 text-xs font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full border transition-all ${
                    selectedSpecialty === s.slug
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {/* ── Panneau filtres ── */}
          {showFilters && (
            <div className="mx-4 mb-2 bg-neutral-50 border border-neutral-100 rounded-2xl p-4 space-y-4">

              {/* Ville + géocodage */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin size={11} className="text-neutral-400" />
                  <label className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Ville</label>
                  {geocoding && <Loader2 size={11} className="text-neutral-400 animate-spin ml-auto" />}
                  {!geocoding && geoCenter?.source === 'city' && cityInput.trim() && (
                    <span className="ml-auto text-[10px] text-neutral-400 font-medium">
                      {geoCenter.lat.toFixed(4)}, {geoCenter.lng.toFixed(4)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ex : Haguenau, Strasbourg, Lyon..."
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className={`w-full pl-8 pr-8 py-2.5 bg-white border rounded-xl text-sm focus:outline-none transition-all ${
                      geocodeError ? 'border-amber-300 focus:border-amber-400' : 'border-neutral-200 focus:border-neutral-400'
                    }`}
                  />
                  {cityInput && (
                    <button onClick={() => setCityInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {geocodeError && (
                  <p className="text-[11px] text-amber-600 mt-1">{geocodeError}</p>
                )}
                {!cityInput && suggestedCities.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {suggestedCities.map((c) => (
                      <button key={c} onClick={() => setCityInput(c)} className="text-xs text-neutral-500 bg-white border border-neutral-200 px-2.5 py-1 rounded-full hover:border-neutral-400 hover:text-neutral-900 transition-all">
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Rayon — uniquement si un centre est disponible (GPS ou ville géocodée) */}
              {hasGeo && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Navigation size={11} className="text-neutral-400" />
                    <label className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                      Rayon autour de {geoCenter?.display}
                    </label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {RADIUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setRadius(opt.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                          radius === opt.value
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Note minimum */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Star size={11} className="text-neutral-400" />
                  <label className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Note minimum</label>
                </div>
                <div className="flex gap-2">
                  {MIN_RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMinRating(opt.value)}
                      className={`flex items-center gap-1 text-sm font-medium px-3.5 py-2 rounded-xl border transition-all ${
                        minRating === opt.value
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {opt.value > 0 && <Star size={12} fill="currentColor" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trier par */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ArrowUpDown size={11} className="text-neutral-400" />
                  <label className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Trier par</label>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {SORT_OPTIONS.filter((o) => o.value !== 'distance' || hasGeo).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                        sortBy === opt.value
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bouton Réinitialiser */}
              <button
                onClick={resetAll}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-neutral-700 border border-neutral-200 rounded-xl hover:border-neutral-400 hover:text-neutral-900 transition-all"
              >
                <RotateCcw size={14} />
                Réinitialiser les filtres
              </button>
            </div>
          )}

          {/* Chips filtres actifs */}
          {!showFilters && (radiusActive || cityInput.trim() || minRating > 0) && (
            <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
              {radiusActive && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-full">
                  <Navigation size={11} />
                  {radius} km {geoCenter ? `· ${geoCenter.display}` : ''}
                  <button onClick={() => setRadius(999)} className="ml-0.5 text-neutral-400 hover:text-neutral-700">
                    <X size={11} />
                  </button>
                </span>
              )}
              {cityInput.trim() && !radiusActive && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-full">
                  <MapPin size={11} />{cityInput.trim()}
                  {geocoding && <Loader2 size={10} className="animate-spin" />}
                  <button onClick={() => setCityInput('')} className="ml-0.5 text-neutral-400 hover:text-neutral-700">
                    <X size={11} />
                  </button>
                </span>
              )}
              {minRating > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-full">
                  <Star size={11} fill="currentColor" />{minRating}+
                  <button onClick={() => setMinRating(0)} className="ml-0.5 text-neutral-400 hover:text-neutral-700">
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
          )}

          <div className="h-px bg-neutral-100" />
        </div>

        {/* ━━━ RÉSULTATS ━━━ */}
        <div className="px-4 pt-4 pb-28 md:pb-8">

          {/* Compteur contextuel */}
          {!isLoading && hairdressers.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-neutral-400">
                {total} coiffeur{total !== 1 ? 's' : ''}
                {selectedSpecialty && specialtyMap[selectedSpecialty] ? ` · ${specialtyMap[selectedSpecialty].name}` : ''}
                {applyGeoFilter ? ` · ${radius} km autour de ${geoCenter?.display}` : cityInput.trim() ? ` · ${cityInput.trim()}` : ''}
                {query.trim() ? ` · "${query.trim()}"` : ''}
              </p>
              {hasActiveFilters && (
                <button onClick={resetAll} className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors">
                  Tout effacer
                </button>
              )}
            </div>
          )}

          {/* Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          )}

          {/* Grille résultats */}
          {!isLoading && hairdressers.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {hairdressersWD.map((h) => (
                <HairdresserCard key={h.id} hairdresser={h} distanceKm={h.distance_km} />
              ))}
            </div>
          )}

          {/* ── État vide intelligent ── */}
          {!isLoading && hairdressers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mx-auto mb-5">
                <Search size={22} className="text-neutral-300" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 mb-2">Aucun résultat</h3>
              <p className="text-sm text-neutral-400 max-w-xs leading-relaxed mb-6">{emptyMessage()}</p>

              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                {applyGeoFilter && (
                  <>
                    {radius < 10  && <button onClick={() => setRadius(10)}  className="w-full text-sm font-medium text-neutral-700 border border-neutral-200 px-5 py-2.5 rounded-xl hover:border-neutral-400 transition-colors">Élargir à 10 km</button>}
                    {radius < 20  && <button onClick={() => setRadius(20)}  className="w-full text-sm font-medium text-neutral-700 border border-neutral-200 px-5 py-2.5 rounded-xl hover:border-neutral-400 transition-colors">Élargir à 20 km</button>}
                    {radius < 50  && <button onClick={() => setRadius(50)}  className="w-full text-sm font-medium text-neutral-700 border border-neutral-200 px-5 py-2.5 rounded-xl hover:border-neutral-400 transition-colors">Élargir à 50 km</button>}
                    <button onClick={() => setRadius(999)} className="w-full text-sm font-medium text-neutral-700 border border-neutral-200 px-5 py-2.5 rounded-xl hover:border-neutral-400 transition-colors">
                      Voir toute la France
                    </button>
                  </>
                )}

                {selectedSpecialty && (
                  <button onClick={() => setSelectedSpecialty(null)} className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
                    Retirer le filtre spécialité
                  </button>
                )}

                {hasActiveFilters && (
                  <button onClick={resetAll} className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
                    <RotateCcw size={13} />
                    Réinitialiser tous les filtres
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function RechercherPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-3xl mx-auto">
          <div className="sticky top-0 z-20 bg-white px-4 pt-4 pb-3 border-b border-neutral-100">
            <div className="h-12 bg-neutral-100 rounded-2xl animate-pulse mb-3" />
            <div className="flex gap-2 overflow-hidden">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="h-8 w-20 flex-shrink-0 bg-neutral-100 rounded-full animate-pulse" />
              ))}
            </div>
          </div>
          <div className="px-4 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    }>
      <RechercherContent />
    </Suspense>
  );
}
