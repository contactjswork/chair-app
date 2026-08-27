'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Clock, Loader2, MapPin, Navigation,
  Scissors, Search, User, X,
} from 'lucide-react';
import { search as searchApi } from '@/lib/api';
import type { ApiSearchSuggestion } from '@/lib/types';
import {
  SPECIALTY_LABELS, geocodeCity, getRecentSearches,
  removeRecentSearch, clearRecentSearches, saveRecentSearch,
} from '@/lib/explore';
import type { RecentSearch } from '@/lib/explore';
import { getLiveSpecialtyLabels } from '@/lib/specialties';
import { FilterChip } from '@/components/ui/Badge';
import { PrimaryButton, IconButton } from '@/components/ui/Button';

export interface SearchDraft {
  q: string;
  specialties: string[];
  city: string | null;
  cityCoords: { lat: number; lng: number } | null;
  useMyPosition: boolean;
  radius: number | null;
}

interface Props {
  open: boolean;
  initial: SearchDraft;
  hasGeolocation: boolean;
  /** Renvoie null si la position a ete obtenue, sinon le message d echec. */
  onRequestGeolocation: () => Promise<string | null>;
  onClose: () => void;
  onApply: (draft: SearchDraft) => void;
}

const SUGGESTION_TAG: Record<string, string> = {
  specialty:   'Spécialité',
  hairdresser: 'Coiffeur',
  city:        'Ville',
  location:    'Région',
  service:     'Service',
};

/** Modale Recherche plein écran — quoi (texte/spécialité) + où (ville/position) +
 *  récents. La distance/note/tri vivent uniquement dans "Filtres" (une seule
 *  surface pour ça) — ce modal ne duplique plus le grand picker de catégories. */
export default function SearchModal({ open, initial, hasGeolocation, onRequestGeolocation, onClose, onApply }: Props) {
  const [q, setQ]                     = useState(initial.q);
  const [specialties, setSpecialties] = useState<string[]>(initial.specialties);
  const [cityInput, setCityInput]     = useState(initial.city ?? '');
  const [cityCoords, setCityCoords]   = useState(initial.cityCoords);
  const [useMyPosition, setUseMyPos]  = useState(initial.useMyPosition);
  // Le rayon est réglé dans "Filtres" (une seule surface pour ça) — ce
  // modal ne fait que transmettre la valeur courante sans la modifier.
  const radius = initial.radius;

  const [suggestions, setSuggestions] = useState<ApiSearchSuggestion[]>([]);
  // Le parent remonte la modale via une prop `key` à chaque ouverture — les
  // états repartent donc toujours du brouillon courant, sans effet de resync.
  const [recents, setRecents]         = useState<RecentSearch[]>(() => getRecentSearches());
  const [cityError, setCityError]     = useState<string | null>(null);
  const [applying, setApplying]       = useState(false);
  const [geoLoading, setGeoLoading]   = useState(false);
  // Libellés live (DB, administrables sans build) — repli sur SPECIALTY_LABELS
  // tant que le fetch n'a pas résolu / si l'API tombe.
  const [liveLabels, setLiveLabels]   = useState<Record<string, string>>(SPECIALTY_LABELS);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLiveSpecialtyLabels().then((map) => { if (!cancelled) setLiveLabels(map); });
    return () => { cancelled = true; };
  }, []);

  // Verrouillage du scroll de fond + fermeture Escape
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Autocomplétion — l'effacement de la liste se fait dans les handlers
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open || q.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchApi.suggestions(q.trim());
        setSuggestions(res.suggestions);
      } catch { setSuggestions([]); }
    }, 220);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, open]);

  if (!open) return null;

  function applySuggestion(s: ApiSearchSuggestion) {
    setSuggestions([]);
    if (s.type === 'specialty' && s.slug) {
      setSpecialties([s.slug]);
      setQ('');
    } else if (s.type === 'city' || s.type === 'location') {
      setCityInput(s.value);
      setCityCoords(null);
      setUseMyPos(false);
      setCityError(null);
    } else {
      setQ(s.value);
    }
  }

  function applyRecent(r: RecentSearch) {
    if (r.type === 'specialty' && r.slug) {
      setSpecialties([r.slug]);
      setQ('');
    } else if (r.type === 'city') {
      setCityInput(r.value);
      setCityCoords(null);
      setUseMyPos(false);
    } else {
      setQ(r.value);
    }
  }

  async function handleUseMyPosition() {
    setGeoLoading(true);
    setCityError(null);
    const failure = hasGeolocation ? null : await onRequestGeolocation();
    setGeoLoading(false);
    if (failure) {
      // Sans cette branche, un echec ne produisait RIEN : le spinner
      // s'arretait et l'ecran restait identique. L'utilisateur retapait.
      setCityError(failure);
      return;
    }
    setUseMyPos(true);
    setCityInput('');
    setCityCoords(null);
  }

  async function handleApply() {
    setApplying(true);
    setCityError(null);

    let coords = cityCoords;
    let cityName: string | null = cityInput.trim() || null;

    if (!useMyPosition && cityName) {
      const geo = await geocodeCity(cityName).catch(() => null);
      if (!geo) {
        setCityError(`"${cityName}" n'est pas reconnue — essayez une ville plus grande.`);
        setApplying(false);
        return;
      }
      coords = { lat: geo.lat, lng: geo.lng };
      cityName = geo.city;
    }

    if (q.trim()) {
      saveRecentSearch({ type: 'query', label: q.trim(), value: q.trim() });
    }
    if (specialties.length === 1) {
      const slug = specialties[0];
      saveRecentSearch({ type: 'specialty', label: liveLabels[slug] ?? slug, value: slug, slug });
    }
    if (cityName && !useMyPosition) {
      saveRecentSearch({ type: 'city', label: cityName, value: cityName });
    }

    setApplying(false);
    onApply({
      q: q.trim(),
      specialties,
      city: useMyPosition ? null : cityName,
      cityCoords: useMyPosition ? null : coords,
      useMyPosition,
      radius,
    });
  }

  const locationLabel = useMyPosition ? 'Position actuelle' : cityInput;

  return (
    <div className="fixed inset-0 z-[85] flex md:items-center md:justify-center">
      <div className="absolute inset-0 bg-neutral-900/40 hidden md:block" onClick={onClose} />

      <div className="relative flex flex-col w-full h-full bg-white md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-3xl md:shadow-2xl md:overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 pt-safe-header md:pt-0">
          <div className="flex items-center justify-between px-5 h-14">
            <h2 className="text-[20px] font-bold text-neutral-900 tracking-[-0.02em]">Rechercher</h2>
            <IconButton onClick={onClose} aria-label="Fermer">
              <X size={17} />
            </IconButton>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-32 md:pb-28">

          {/* ── Quoi ── */}
          <div className="relative">
            <div className="flex items-center gap-3 border border-neutral-200 rounded-2xl px-4 py-3.5 focus-within:border-neutral-500 transition-colors">
              <Search size={17} className="text-neutral-400 flex-shrink-0" />
              <input
                type="text"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (e.target.value.trim().length < 2) setSuggestions([]);
                }}
                placeholder="Coiffeur, salon, prestation, ville..."
                autoComplete="off"
                className="flex-1 min-w-0 text-[14px] text-neutral-900 placeholder-neutral-400 focus:outline-none bg-transparent"
              />
              {q && (
                <button
                  onClick={() => { setQ(''); setSuggestions([]); }}
                  aria-label="Effacer"
                  className="p-1 -m-1 transition-transform active:scale-90"
                >
                  <X size={15} className="text-neutral-400" />
                </button>
              )}
            </div>

            {suggestions.length > 0 && (
              <div className="absolute top-full inset-x-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden z-20">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${s.value}-${i}`}
                    onClick={() => applySuggestion(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 active:bg-neutral-100 transition-colors border-b border-neutral-50 last:border-0"
                  >
                    <span className="flex-shrink-0 text-neutral-400">
                      {s.type === 'specialty' || s.type === 'service' ? <Scissors size={13} /> : s.type === 'hairdresser' ? <User size={13} /> : <MapPin size={13} />}
                    </span>
                    <span className="text-[13px] font-medium text-neutral-900 truncate">{s.label}</span>
                    <span className="ml-auto text-[9px] font-bold tracking-wider uppercase text-neutral-300 flex-shrink-0">
                      {SUGGESTION_TAG[s.type] ?? ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spécialité sélectionnée — même gabarit de chip amovible que la
              liste de résultats (FilterChip actif + croix), au lieu d'un
              bouton recréé à la main avec un padding et une taille de police
              légèrement différents. */}
          {specialties.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2.5">
              {specialties.map((slug) => (
                <FilterChip
                  key={slug}
                  active
                  onClick={() => setSpecialties(specialties.filter((s) => s !== slug))}
                  aria-label={`Retirer la spécialité ${liveLabels[slug] ?? slug}`}
                >
                  {liveLabels[slug] ?? slug}
                  <X size={12} className="text-neutral-400" />
                </FilterChip>
              ))}
            </div>
          )}

          {/* ── Où ── */}
          <div className="mt-3">
            <div className={`flex items-center gap-3 border rounded-2xl px-4 py-3.5 transition-colors ${cityError ? 'border-neutral-900' : 'border-neutral-200 focus-within:border-neutral-500'}`}>
              <MapPin size={17} className="text-neutral-400 flex-shrink-0" />
              {useMyPosition ? (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-[14px] font-medium text-neutral-900">Position actuelle</span>
                  <button
                    onClick={() => setUseMyPos(false)}
                    aria-label="Retirer la position"
                    className="p-1 -m-1 transition-transform active:scale-90"
                  >
                    <X size={15} className="text-neutral-400" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => { setCityInput(e.target.value); setCityCoords(null); setCityError(null); }}
                    placeholder="Ville ou code postal"
                    autoComplete="off"
                    className="flex-1 min-w-0 text-[14px] text-neutral-900 placeholder-neutral-400 focus:outline-none bg-transparent"
                  />
                  <button
                    onClick={handleUseMyPosition}
                    disabled={geoLoading}
                    className="flex items-center gap-1 text-[12px] font-semibold text-neutral-600 flex-shrink-0 transition-colors active:text-neutral-900"
                  >
                    {geoLoading ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                    Ma position
                  </button>
                </>
              )}
            </div>
            {cityError && <p className="text-[12px] text-neutral-500 mt-1.5 px-1">{cityError}</p>}
          </div>

          {/* ── Récents ── */}
          {recents.length > 0 && (
            <div className="mt-7">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[15px] font-bold text-neutral-900">Récents</h3>
                <button
                  onClick={() => { clearRecentSearches(); setRecents([]); }}
                  className="text-[12px] font-medium text-neutral-400 hover:text-neutral-700"
                >
                  Tout effacer
                </button>
              </div>
              {recents.map((r) => (
                <div key={`${r.type}-${r.value}`} className="flex items-center">
                  <button
                    onClick={() => applyRecent(r)}
                    className="flex-1 flex items-center gap-3 py-2.5 text-left min-w-0 rounded-xl transition-colors active:bg-neutral-50"
                  >
                    <span className="w-9 h-9 rounded-full bg-neutral-50 flex items-center justify-center flex-shrink-0">
                      {r.type === 'city' ? <MapPin size={14} className="text-neutral-500" /> : r.type === 'specialty' ? <Scissors size={14} className="text-neutral-500" /> : <Clock size={14} className="text-neutral-500" />}
                    </span>
                    <span className="text-[13px] font-medium text-neutral-800 truncate">{r.label}</span>
                  </button>
                  <button
                    onClick={() => { removeRecentSearch(r); setRecents(getRecentSearches()); }}
                    aria-label={`Supprimer ${r.label}`}
                    className="p-2 text-neutral-300 hover:text-neutral-600 transition-transform active:scale-90"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA sticky */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-6 pb-safe">
          <div className="px-5 pb-4">
            <PrimaryButton onClick={handleApply} loading={applying} fullWidth>
              Rechercher{locationLabel ? ` · ${locationLabel}` : ''}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
