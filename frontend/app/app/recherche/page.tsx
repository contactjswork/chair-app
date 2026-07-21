'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import type { ApiHairdresserProfile, ApiSpecialty, ApiSearchSuggestion } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';
import { search as searchApi } from '@/lib/api';
import { getStoredLocation, storeLocation, requestBrowserGeolocation, formatDistance } from '@/hooks/useGeolocation';
import { estimateLevelColor, LEVEL_RING } from '@/lib/chairLevel';
import {
  Search, X, SlidersHorizontal, MapPin, Star, Scissors, User,
  Navigation, RotateCcw, Loader2, ChevronRight, BadgeCheck, Clock,
  Sparkles, Sun, Droplets, Wind, Minus, Paintbrush,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Recent searches ──────────────────────────────────────────────────────────

const RECENT_KEY = 'chair_recent_searches';
function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecentSearch(q: string) {
  if (!q.trim() || q.trim().length < 2) return;
  const prev = getRecentSearches().filter((s) => s !== q.trim());
  localStorage.setItem(RECENT_KEY, JSON.stringify([q.trim(), ...prev].slice(0, 5)));
}

// ── Specialty ordering by gender ─────────────────────────────────────────────

// Alignés sur l'onboarding — 6 par genre
const SP_HOMME_6 = ['barber', 'coupe-homme', 'coupe-longue', 'barbe', 'couleur-homme', 'dreads'];
const SP_FEMME_6 = ['balayage', 'coupe-femme', 'boucles', 'lissage', 'coloration', 'chignon'];

const NAME_OVERRIDE: Record<string, string> = {
  'barber':        'Barber',
  'coupe-homme':   'Coupe classique',
  'coupe-longue':  'Cheveux longs',
  'barbe':         'Barbe',
  'couleur-homme': 'Couleur créative',
  'dreads':        'Dreads & Locks',
  'balayage':      'Balayage',
  'coupe-femme':   'Coupe & Frange',
  'boucles':       'Boucles',
  'lissage':       'Lissage',
  'coloration':    'Coloration',
  'chignon':       'Chignon & Soirée',
};

function specialtyName(s: ApiSpecialty): string {
  return NAME_OVERRIDE[s.slug] ?? s.name;
}

const SPECIALTY_ICON: Record<string, React.ReactNode> = {
  // Homme
  'barber':        <Scissors   size={12} strokeWidth={2} />,
  'coupe-homme':   <Scissors   size={12} strokeWidth={2} />,
  'coupe-longue':  <Wind       size={12} strokeWidth={2} />,
  'barbe':         <User       size={12} strokeWidth={2} />,
  'couleur-homme': <Paintbrush size={12} strokeWidth={2} />,
  'dreads':        <Minus      size={12} strokeWidth={2.5} />,
  // Femme
  'balayage':      <Sparkles   size={12} strokeWidth={2} />,
  'coupe-femme':   <Scissors   size={12} strokeWidth={2} />,
  'boucles':       <Wind       size={12} strokeWidth={2} />,
  'lissage':       <Minus      size={12} strokeWidth={2.5} />,
  'coloration':    <Paintbrush size={12} strokeWidth={2} />,
  'chignon':       <Sun        size={12} strokeWidth={2} />,
};

// ── Constants ────────────────────────────────────────────────────────────────

const MIN_RATING_OPTIONS = [
  { label: 'Toutes', value: 0 },
  { label: '4+',     value: 4 },
  { label: '4.5+',   value: 4.5 },
];

const RADIUS_OPTIONS = [
  { label: '1 km',            value: 1   },
  { label: '5 km',            value: 5   },
  { label: '10 km',           value: 10  },
  { label: '50 km',           value: 50  },
  { label: 'Partout',         value: 999 },
];

const SORT_OPTIONS = [
  { label: 'Pertinence',      value: 'relevance'  },
  { label: 'Distance',        value: 'distance'   },
  { label: 'Mieux notés',     value: 'rating'     },
  { label: 'Plus demandés',   value: 'popular'    },
  { label: 'Nouveaux talents',value: 'new_quality'},
];

const SUGGESTION_ICON: Record<string, React.ReactNode> = {
  specialty:   <Scissors   size={13} className="text-neutral-400" />,
  hairdresser: <User       size={13} className="text-neutral-400" />,
  city:        <MapPin     size={13} className="text-neutral-400" />,
  location:    <Navigation size={13} className="text-neutral-400" />,
  service:     <Scissors   size={13} className="text-neutral-400" />,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface GeoCenter { lat: number; lng: number; display: string; source: 'gps' | 'city' | 'city-partial'; }
type HWithDist = ApiHairdresserProfile & { distance_km?: number };

// ── Enhanced hairdresser row ──────────────────────────────────────────────────

function HairdresserRow({ h, distanceKm }: { h: ApiHairdresserProfile; distanceKm?: number }) {
  const avatar    = resolveMediaUrl(h.user.avatar);
  const banner    = resolveMediaUrl(h.banner_image);
  const hasRating = h.reviews_count > 0;
  const levelColor = h.chair_level?.color ?? estimateLevelColor(h);
  const ring = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;

  return (
    <Link href={`/app/coiffeur/${h.slug}`} className="flex items-center gap-4 py-4 border-b border-neutral-100 last:border-0 group active:bg-neutral-50 rounded-xl transition-colors -mx-1 px-1">

      {/* Avatar */}
      <div className={`relative flex-shrink-0 w-[60px] h-[60px] rounded-full overflow-hidden bg-neutral-100 ${ring.show ? 'ring-2 ring-offset-1 ring-amber-400' : ''}`}>
        {avatar ? (
          <Image src={avatar} alt={h.user.name} fill className="object-cover" sizes="60px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-200">
            <span className="text-xl font-bold text-neutral-400">{h.user.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-[14px] font-bold text-neutral-900 truncate leading-tight">{h.user.name}</p>
          {h.is_verified && <BadgeCheck size={14} className="text-violet-600 flex-shrink-0" />}
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          {(distanceKm != null || h.city) && (
            <span className="flex items-center gap-0.5 text-[12px] text-neutral-400">
              <MapPin size={10} />
              {distanceKm != null ? formatDistance(distanceKm) : h.city}
            </span>
          )}
          {hasRating && (
            <span className="flex items-center gap-0.5 text-[12px] font-semibold text-neutral-800">
              <Star size={10} className="fill-amber-400 stroke-none" />
              {parseFloat(h.avg_rating).toFixed(1)}
              <span className="font-normal text-neutral-400 text-[11px]">({h.reviews_count})</span>
            </span>
          )}
        </div>

        {h.specialties.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {h.specialties.slice(0, 3).map((s) => (
              <span key={s.slug} className="text-[10px] font-semibold uppercase tracking-wide bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <ChevronRight size={16} className="text-neutral-300 flex-shrink-0 group-hover:text-neutral-500 transition-colors" />
    </Link>
  );
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function HairdresserGridCard({ h, distanceKm }: { h: ApiHairdresserProfile; distanceKm?: number }) {
  const avatar = resolveMediaUrl(h.user.avatar);
  const banner = resolveMediaUrl(h.banner_image);
  const bg = banner ?? avatar;
  const hasRating = h.reviews_count > 0;
  const spec = h.specialties[0]?.name;

  return (
    <Link href={`/app/coiffeur/${h.slug}`} className="block group">
      <div className="relative rounded-2xl overflow-hidden bg-neutral-200 aspect-[3/4]">
        {bg && (
          <Image src={bg} alt={h.user.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500 brightness-75" sizes="200px" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-transparent" />

        {h.is_verified && (
          <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white/95 flex items-center justify-center shadow">
            <BadgeCheck size={11} className="text-violet-600" />
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {spec && <p className="text-[8px] font-bold text-white/50 tracking-[0.14em] uppercase mb-0.5">{spec}</p>}
          <h3 className="text-white font-bold text-[13px] leading-tight truncate">{h.user.name}</h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-white/50 text-[10px] truncate">
              {distanceKm != null ? formatDistance(distanceKm) : h.city ?? ''}
            </span>
            {hasRating && (
              <div className="flex items-center gap-0.5">
                <Star size={9} className="fill-amber-400 stroke-none" />
                <span className="text-white text-[10px] font-bold">{parseFloat(h.avg_rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Step track (frise à points) ───────────────────────────────────────────────

function StepTrack({ options, activeIndex, onChange }: {
  options: string[];
  activeIndex: number;
  onChange: (i: number) => void;
}) {
  const n   = options.length - 1;
  const pct = (activeIndex / n) * 100;

  return (
    <div className="px-4">
      {/* Track */}
      <div className="relative h-6 flex items-center">
        {/* Rail fond */}
        <div className="absolute inset-x-0 h-[2px] bg-neutral-150 rounded-full" style={{ background: '#e5e5e5' }} />
        {/* Rail actif */}
        <div
          className="absolute h-[2px] bg-neutral-900 rounded-full transition-all duration-250"
          style={{ width: `${pct}%` }}
        />
        {/* Dots */}
        {options.map((_, i) => {
          const past   = i < activeIndex;
          const active = i === activeIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              style={{ left: `${(i / n) * 100}%` }}
              className="absolute -translate-x-1/2 flex items-center justify-center w-8 h-8"
            >
              <span className={`block rounded-full transition-all duration-200 ${
                active
                  ? 'w-5 h-5 bg-neutral-900 ring-[3px] ring-white outline outline-[2px] outline-neutral-900'
                  : past
                  ? 'w-3 h-3 bg-neutral-900'
                  : 'w-3 h-3 bg-neutral-200'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Labels */}
      <div className="relative h-7 mt-1">
        {options.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            style={{ left: `${(i / n) * 100}%` }}
            className={`absolute -translate-x-1/2 text-[12px] font-semibold whitespace-nowrap transition-colors ${
              i === activeIndex ? 'text-neutral-900' : 'text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Filter bottom sheet ───────────────────────────────────────────────────────

function FilterSheet({
  open, onClose,
  sortBy, setSortBy,
  minRating, setMinRating,
  radius, setRadius,
  hasGeo, geoCenter,
  onReset, resultsCount,
}: {
  open: boolean; onClose: () => void;
  sortBy: string; setSortBy: (v: string) => void;
  minRating: number; setMinRating: (v: number) => void;
  radius: number; setRadius: (v: number) => void;
  hasGeo: boolean; geoCenter: GeoCenter | null;
  onReset: () => void; resultsCount: number;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl pb-safe" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
          <h2 className="text-[16px] font-bold text-neutral-900">Filtres & tri</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
            <X size={15} className="text-neutral-700" />
          </button>
        </div>

        <div className="px-5 pt-5 pb-5 space-y-7">

          {/* Trier par */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 mb-3">Trier par</p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.filter((o) => o.value !== 'distance' || hasGeo).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`text-[13px] font-semibold px-4 py-2.5 rounded-2xl border transition-all ${
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

          {/* Note minimum — frise */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 mb-4">Note minimum</p>
            <StepTrack
              options={MIN_RATING_OPTIONS.map((o) => o.label)}
              activeIndex={MIN_RATING_OPTIONS.findIndex((o) => o.value === minRating)}
              onChange={(i) => setMinRating(MIN_RATING_OPTIONS[i].value)}
            />
          </div>

          {/* Distance — frise */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 mb-4">
              Distance
              {geoCenter && <span className="font-normal normal-case tracking-normal text-neutral-400"> · autour de {geoCenter.display}</span>}
            </p>
            <StepTrack
              options={RADIUS_OPTIONS.map((o) => o.label)}
              activeIndex={RADIUS_OPTIONS.findIndex((o) => o.value === radius)}
              onChange={(i) => setRadius(RADIUS_OPTIONS[i].value)}
            />
          </div>


        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-5 py-4 flex gap-3">
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-5 py-3.5 text-[13px] font-semibold text-neutral-600 border border-neutral-200 rounded-2xl hover:border-neutral-400 transition-colors"
          >
            <RotateCcw size={13} />
            Réinitialiser
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3.5 text-[14px] font-semibold text-white bg-neutral-900 rounded-2xl hover:bg-neutral-700 transition-colors"
          >
            Voir les coiffeurs
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function RechercheContent() {
  const searchParams = useSearchParams();

  // ── Filtres ────────────────────────────────────────────────────────────────
  const [query,            setQuery]            = useState(() => searchParams.get('q') ?? '');
  const [cityInput,        setCityInput]        = useState(() => searchParams.get('city') ?? '');
  const [selectedSpecialty,setSelectedSpecialty]= useState<string | null>(() => searchParams.get('specialty'));
  const [minRating,        setMinRating]        = useState(0);
  const [sortBy,           setSortBy]           = useState('relevance');
  const [radius,           setRadius]           = useState(999);
  const [geoRequesting,    setGeoRequesting]    = useState(false);
  const [showGeoDialog,    setShowGeoDialog]    = useState(false);
  const [pendingRadius,    setPendingRadius]    = useState<number | null>(null);

  // ── Données ───────────────────────────────────────────────────────────────
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>([]);
  const [specialties,  setSpecialties]  = useState<ApiSpecialty[]>([]);
  const [total,        setTotal]        = useState(0);
  const [isLoading,    setIsLoading]    = useState(true);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [inputFocused,    setInputFocused]    = useState(false);
  const [recentSearches,  setRecentSearches]  = useState<string[]>([]);
  const [prefs,           setPrefs]           = useState<{ gender?: string; interests?: string[] }>({});

  // ── Géo ───────────────────────────────────────────────────────────────────
  const [geoCenter,    setGeoCenter]    = useState<GeoCenter | null>(null);
  const [geocoding,    setGeocoding]    = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // ── Suggestions ──────────────────────────────────────────────────────────
  const [suggestions,     setSuggestions]     = useState<ApiSearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx,       setActiveIdx]       = useState(-1);

  const debounceRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBarRef       = useRef<HTMLDivElement>(null);

  // ── Dynamic placeholder from preferences ──────────────────────────────────
  const placeholder = (() => {
    const interests = prefs.interests ?? [];
    const SLUG_LABEL: Record<string, string> = {
      barber: 'Barber', degrade: 'Dégradé', fade: 'Fade', balayage: 'Balayage',
      blond: 'Blond', coloration: 'Coloration', 'ombre-hair': 'Ombré', boucles: 'Boucles',
    };
    if (interests.length >= 2) {
      return interests.slice(0, 3).map((s) => SLUG_LABEL[s] ?? s).join(', ') + '...';
    }
    if (prefs.gender === 'homme') return 'Barber, Dégradé, Fade...';
    if (prefs.gender === 'femme') return 'Balayage, Blond, Ombré...';
    return 'Balayage, Barber, blond polaire...';
  })();

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/specialties`).then((r) => r.json()).then(setSpecialties).catch(() => {});

    const loc = getStoredLocation();
    if (loc) {
      setGeoCenter({ lat: loc.latitude, lng: loc.longitude, display: 'Ma position', source: 'gps' });
      setSortBy('distance');
    }

    setRecentSearches(getRecentSearches());

    try {
      const raw = localStorage.getItem('chair_preferences');
      if (raw) setPrefs(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // ── Geocoding ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
    setGeocodeError(null);
    if (!cityInput.trim()) {
      const loc = getStoredLocation();
      if (loc) setGeoCenter({ lat: loc.latitude, lng: loc.longitude, display: 'Ma position', source: 'gps' });
      else setGeoCenter(null);
      return;
    }
    geocodeDebounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await fetch(`${API}/geocode?q=${encodeURIComponent(cityInput.trim())}`);
        const data = await res.json();
        if (res.ok && data.lat != null) {
          setGeoCenter({ lat: data.lat, lng: data.lng, display: data.city, source: 'city' });
        } else {
          const loc = getStoredLocation();
          if (loc) setGeoCenter({ lat: loc.latitude, lng: loc.longitude, display: 'Ma position', source: 'gps' });
          else setGeoCenter(null);
          if (cityInput.trim().length > 2) setGeocodeError(`"${cityInput.trim()}" non reconnue.`);
        }
      } catch { /* silent */ }
      setGeocoding(false);
    }, 600);
    return () => { if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current); };
  }, [cityInput]);

  // ── Suggestions ──────────────────────────────────────────────────────────
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

  // ── Close suggestions on click outside ───────────────────────────────────
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setInputFocused(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // ── Search logic ──────────────────────────────────────────────────────────
  const doSearch = useCallback(async (
    q: string, city: string, specialty: string | null,
    rating: number, sort: string, r: number, center: GeoCenter | null,
  ) => {
    setIsLoading(true);
    try {
      const applyGeoFilter = center !== null && r < 999;
      let items: ApiHairdresserProfile[] = [];

      if (q.trim()) {
        const data = await searchApi.query({
          q: q.trim(),
          city: (!applyGeoFilter && city.trim()) ? city.trim() : undefined,
          specialty: specialty || undefined,
          min_rating: rating > 0 ? rating : undefined,
          lat: applyGeoFilter ? center!.lat : undefined,
          lng: applyGeoFilter ? center!.lng : undefined,
          radius: applyGeoFilter ? r : undefined,
          per_page: 50,
        });
        items = data.data;
      } else {
        const params = new URLSearchParams({ per_page: '50' });
        if (specialty) params.set('specialty', specialty);
        if (applyGeoFilter) {
          params.set('lat', String(center!.lat));
          params.set('lng', String(center!.lng));
          params.set('radius', String(r));
        } else {
          if (city.trim()) params.set('city', city.trim());
          if (sort === 'popular') params.set('sort', 'popular');
          else params.set('sort', 'default');
        }
        const res = await fetch(`${API}/hairdressers?${params}`);
        const data = await res.json();
        items = data.data ?? [];
      }

      if (center !== null && !applyGeoFilter) {
        items = items.map((h) => {
          const hLat = h.latitude  != null ? parseFloat(String(h.latitude))  : null;
          const hLng = h.longitude != null ? parseFloat(String(h.longitude)) : null;
          if (hLat != null && hLng != null) (h as HWithDist).distance_km = haversineKm(center.lat, center.lng, hLat, hLng);
          return h;
        });
      }

      if (rating > 0) items = items.filter((h) => h.reviews_count > 0 && parseFloat(h.avg_rating) >= rating);

      if (sort === 'rating') {
        items = [...items].sort((a, b) => parseFloat(b.avg_rating) - parseFloat(a.avg_rating));
      } else if (sort === 'popular') {
        items = [...items].sort((a, b) => {
          const sa = parseFloat(a.avg_rating) * a.reviews_count + a.followers_count + a.visits_count;
          const sb = parseFloat(b.avg_rating) * b.reviews_count + b.followers_count + b.visits_count;
          return sb - sa;
        });
      } else if (sort === 'distance' && center !== null && !applyGeoFilter) {
        items = [...items].sort((a, b) => ((a as HWithDist).distance_km ?? Infinity) - ((b as HWithDist).distance_km ?? Infinity));
      }

      setHairdressers(items);
      setTotal(items.length);
    } catch {
      setHairdressers([]);
      setTotal(0);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (geocoding) return;
    const delay = query.trim() ? 350 : 0;
    searchDebounceRef.current = setTimeout(() => {
      doSearch(query, cityInput, selectedSpecialty, minRating, sortBy, radius, geoCenter);
    }, delay);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [query, cityInput, selectedSpecialty, minRating, sortBy, radius, geoCenter, geocoding, doSearch]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function applySuggestion(s: ApiSearchSuggestion) {
    setShowSuggestions(false);
    setInputFocused(false);
    setActiveIdx(-1);
    if (s.type === 'specialty' && s.slug) {
      setSelectedSpecialty(s.slug);
      setQuery('');
    } else if (s.type === 'city') {
      setCityInput(s.value);
      setQuery('');
    } else {
      setQuery(s.value);
      saveRecentSearch(s.value);
      setRecentSearches(getRecentSearches());
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (activeIdx >= 0 && suggestions[activeIdx]) { applySuggestion(suggestions[activeIdx]); return; }
      if (query.trim()) { saveRecentSearch(query.trim()); setRecentSearches(getRecentSearches()); }
      setShowSuggestions(false);
      setInputFocused(false);
    }
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Escape') { setShowSuggestions(false); setInputFocused(false); setActiveIdx(-1); }
  }

  async function doRequestGeo(value: number) {
    setGeoRequesting(true);
    try {
      const coords = await requestBrowserGeolocation();
      storeLocation({ latitude: coords.latitude, longitude: coords.longitude });
      setGeoCenter({ lat: coords.latitude, lng: coords.longitude, display: 'Ma position', source: 'gps' });
      setSortBy('distance');
    } catch { /* permission refusée */ } finally { setGeoRequesting(false); }
  }

  async function handleSetRadius(value: number) {
    setRadius(value);
    if (value < 999 && geoCenter === null && !geoRequesting) {
      // Montrer le dialog d'explication avant de demander la permission GPS
      setPendingRadius(value);
      setShowGeoDialog(true);
      return;
    }
    if (value < 999 && geoCenter === null && !geoRequesting) {
      setGeoRequesting(true);
      try {
        const coords = await requestBrowserGeolocation();
        storeLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setGeoCenter({ lat: coords.latitude, lng: coords.longitude, display: 'Ma position', source: 'gps' });
        setSortBy('distance');
      } catch { /* user denied — keep radius set, applyGeoFilter stays false */ }
      finally { setGeoRequesting(false); }
    }
  }

  function resetAll() {
    setQuery(''); setCityInput(''); setSelectedSpecialty(null);
    setMinRating(0); setRadius(999); setGeocodeError(null);
    const loc = getStoredLocation();
    if (loc) { setGeoCenter({ lat: loc.latitude, lng: loc.longitude, display: 'Ma position', source: 'gps' }); setSortBy('distance'); }
    else { setGeoCenter(null); setSortBy('relevance'); }
    setShowFilterSheet(false);
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const specialtyMap = Object.fromEntries(specialties.map((s) => [s.slug, s]));
  const hommeRow = SP_HOMME_6.map((sl) => specialtyMap[sl]).filter(Boolean);
  const femmeRow = SP_FEMME_6.map((sl) => specialtyMap[sl]).filter(Boolean);
  // Afficher seulement le genre du compte — les deux si non renseigné
  const visibleSpecialties =
    prefs.gender === 'homme' ? hommeRow :
    prefs.gender === 'femme' ? femmeRow :
    [...hommeRow, ...femmeRow];

  const hairdressersWD   = hairdressers as HWithDist[];
  const hasGeo           = geoCenter !== null;
  const radiusActive     = radius < 999;
  const applyGeoFilter   = hasGeo && radiusActive;
  const hasActiveFilters = !!(query.trim() || cityInput.trim() || selectedSpecialty || minRating > 0 || radiusActive);

  const activeFiltersCount = [
    minRating > 0    ? 1 : 0,
    radiusActive     ? 1 : 0,
    sortBy !== 'relevance' && sortBy !== 'distance' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const showDropdown = inputFocused && (
    (query.length >= 2 && suggestions.length > 0) ||
    (query.length === 0 && recentSearches.length > 0)
  );

  function emptyMessage() {
    if (applyGeoFilter) {
      if (selectedSpecialty) return `Aucun spécialiste ${specialtyMap[selectedSpecialty]?.name ?? ''} dans ${radius} km.`;
      return `Aucun coiffeur dans ${radius} km autour de ${geoCenter?.display}.`;
    }
    if (query) return `Aucun résultat pour "${query}".`;
    if (selectedSpecialty) return `Aucun spécialiste ${specialtyMap[selectedSpecialty]?.name ?? ''} pour l'instant.`;
    return "Aucun coiffeur disponible pour l'instant.";
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AppShell>

      {/* Dialog GPS — explication avant demande de permission */}
      {showGeoDialog && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 px-4 pb-8">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
            <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center mb-4">
              <Navigation size={22} className="text-white" />
            </div>
            <h3 className="text-[17px] font-bold text-neutral-900 mb-2">Activer la localisation</h3>
            <p className="text-[14px] text-neutral-500 leading-relaxed mb-5">
              CHAIR utilise ta position uniquement pour trier les coiffeurs par distance. Elle n'est jamais partagée avec des tiers.
            </p>
            <button
              onClick={async () => {
                setShowGeoDialog(false);
                if (pendingRadius !== null) await doRequestGeo(pendingRadius);
                setPendingRadius(null);
              }}
              className="w-full py-3.5 bg-neutral-900 text-white font-semibold rounded-2xl text-[14px] mb-2"
            >
              Autoriser la localisation
            </button>
            <button
              onClick={() => { setShowGeoDialog(false); setRadius(999); setPendingRadius(null); }}
              className="w-full py-3 text-neutral-400 text-[14px] font-medium"
            >
              Non merci
            </button>
          </div>
        </div>
      )}

      <FilterSheet
        open={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        sortBy={sortBy} setSortBy={setSortBy}
        minRating={minRating} setMinRating={setMinRating}
        radius={radius} setRadius={handleSetRadius}
        hasGeo={hasGeo} geoCenter={geoCenter}
        onReset={resetAll}
        resultsCount={total}
      />

      <div className="max-w-3xl mx-auto">

        {/* ── STICKY HEADER ── */}
        <div className="sticky top-content-mobile z-30 bg-white/95 backdrop-blur-sm">

          {/* Search row */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2" ref={searchBarRef}>

            {/* Search input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); setActiveIdx(-1); }}
                onFocus={() => { setInputFocused(true); if (suggestions.length > 0 || recentSearches.length > 0) setShowSuggestions(true); }}
                onKeyDown={handleSearchKeyDown}
                autoComplete="off"
                className="w-full pl-9 pr-8 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-[14px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
              {query && (
                <button onClick={() => { setQuery(''); setSuggestions([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                  <X size={15} />
                </button>
              )}

              {/* Suggestions / recent */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden z-50">

                  {/* Recent searches */}
                  {query.length === 0 && recentSearches.length > 0 && (
                    <>
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-50">
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400">Récent</p>
                        <button
                          onMouseDown={(e) => { e.preventDefault(); localStorage.removeItem(RECENT_KEY); setRecentSearches([]); }}
                          className="text-[10px] text-neutral-400 hover:text-neutral-700 transition-colors"
                        >
                          Tout effacer
                        </button>
                      </div>
                      {recentSearches.map((r) => (
                        <button
                          key={r}
                          onMouseDown={(e) => { e.preventDefault(); setQuery(r); setShowSuggestions(false); setInputFocused(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0"
                        >
                          <Clock size={13} className="text-neutral-300 flex-shrink-0" />
                          <span className="text-neutral-700 font-medium">{r}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Live suggestions */}
                  {query.length >= 2 && suggestions.map((s, i) => (
                    <button
                      key={`${s.type}-${s.value}-${i}`}
                      onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${i === activeIdx ? 'bg-neutral-50' : 'hover:bg-neutral-50'} ${i < suggestions.length - 1 ? 'border-b border-neutral-50' : ''}`}
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

            {/* Filter button */}
            <button
              onClick={() => setShowFilterSheet(true)}
              className={`relative flex items-center gap-1.5 px-3.5 py-3 rounded-2xl border text-sm font-medium transition-all flex-shrink-0 ${
                activeFiltersCount > 0
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <SlidersHorizontal size={15} />
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-neutral-900 text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Specialty chips — scroll horizontal avec icônes */}
          {specialties.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 no-scrollbar">
              {visibleSpecialties.map((s) => {
                const active = selectedSpecialty === s.slug;
                const icon = SPECIALTY_ICON[s.slug];
                return (
                  <button
                    key={s.slug}
                    onClick={() => setSelectedSpecialty(active ? null : s.slug)}
                    className={`flex-shrink-0 flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-2xl border transition-all ${
                      active
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
                    }`}
                  >
                    {icon && <span className="opacity-70">{icon}</span>}
                    {specialtyName(s)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="h-px bg-neutral-100" />
        </div>

        {/* ── CONTENT ── */}
        <div className="px-4 pt-2 pb-28 md:pb-8">


          {/* Skeleton */}
          {isLoading && (
            <div className="space-y-0 divide-y divide-neutral-100">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <div className="w-[68px] h-[68px] rounded-2xl bg-neutral-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-neutral-100 rounded-full animate-pulse w-2/3" />
                    <div className="h-3 bg-neutral-100 rounded-full animate-pulse w-1/2" />
                    <div className="h-3 bg-neutral-100 rounded-full animate-pulse w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && hairdressers.length > 0 && (
            <div className="divide-y divide-neutral-100">
              {hairdressersWD.map((h) => (
                <HairdresserRow key={h.id} h={h} distanceKm={h.distance_km} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && hairdressers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-5">
                <Search size={22} className="text-neutral-300" />
              </div>
              <h3 className="text-[16px] font-bold text-neutral-900 mb-2">Aucun résultat</h3>
              <p className="text-[13px] text-neutral-400 max-w-xs leading-relaxed mb-6">{emptyMessage()}</p>

              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                {applyGeoFilter && (
                  <>
                    {radius < 20  && <button onClick={() => setRadius(20)}  className="w-full text-[13px] font-semibold text-neutral-700 border border-neutral-200 px-5 py-3 rounded-2xl hover:border-neutral-400 transition-colors">Élargir à 20 km</button>}
                    {radius < 50  && <button onClick={() => setRadius(50)}  className="w-full text-[13px] font-semibold text-neutral-700 border border-neutral-200 px-5 py-3 rounded-2xl hover:border-neutral-400 transition-colors">Élargir à 50 km</button>}
                    <button onClick={() => setRadius(999)} className="w-full text-[13px] font-semibold text-neutral-700 border border-neutral-200 px-5 py-3 rounded-2xl hover:border-neutral-400 transition-colors">Toute la France</button>
                  </>
                )}
                {selectedSpecialty && (
                  <button onClick={() => setSelectedSpecialty(null)} className="text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors">
                    Retirer la spécialité
                  </button>
                )}
                {hasActiveFilters && (
                  <button onClick={resetAll} className="flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors">
                    <RotateCcw size={12} /> Réinitialiser tous les filtres
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

export default function RecherchePage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-3xl mx-auto">
          <div className="sticky top-content-mobile z-30 bg-white px-4 pt-3 pb-3">
            <div className="h-12 bg-neutral-100 rounded-2xl animate-pulse mb-3" />
            <div className="flex gap-2 overflow-hidden pb-3">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="h-8 w-20 flex-shrink-0 bg-neutral-100 rounded-full animate-pulse" />
              ))}
            </div>
            <div className="h-px bg-neutral-100" />
          </div>
          <div className="px-4 pt-4 divide-y divide-neutral-100">
            {[1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4">
                <div className="w-[68px] h-[68px] rounded-2xl bg-neutral-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-neutral-100 rounded-full animate-pulse w-2/3" />
                  <div className="h-3 bg-neutral-100 rounded-full animate-pulse w-1/2" />
                  <div className="h-3 bg-neutral-100 rounded-full animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    }>
      <RechercheContent />
    </Suspense>
  );
}
