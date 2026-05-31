'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import HairdresserCard from '@/components/ui/HairdresserCard';
import type { ApiHairdresserProfile, ApiSpecialty, PaginatedResponse } from '@/lib/types';
import { Search, X, SlidersHorizontal, MapPin, Star } from 'lucide-react';

const API = 'http://localhost:8000/api';

// Ordre d'affichage des spécialités dans les pills
const SPECIALTY_ORDER = [
  'balayage', 'barber', 'coupe-femme', 'coupe-homme', 'boucles',
  'blond', 'coloration', 'ombre-hair', 'lissage', 'extensions',
  'hair-contouring', 'mariage',
];

const MIN_RATING_OPTIONS = [
  { label: 'Toutes', value: 0 },
  { label: '4+', value: 4 },
  { label: '4.5+', value: 4.5 },
];

// Villes suggérées dynamiquement depuis les résultats
function extractCities(hairdressers: ApiHairdresserProfile[]): string[] {
  const cities = hairdressers
    .map((h) => h.city)
    .filter((c): c is string => !!c);
  return [...new Set(cities)].slice(0, 5);
}

function RechercherContent() {
  const searchParams = useSearchParams();

  const [hairdressers, setHairdressers]           = useState<ApiHairdresserProfile[]>([]);
  const [specialties, setSpecialties]             = useState<ApiSpecialty[]>([]);
  const [query, setQuery]                         = useState(() => searchParams.get('q') ?? '');
  const [cityInput, setCityInput]                 = useState(() => searchParams.get('city') ?? '');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(() => searchParams.get('specialty'));
  const [minRating, setMinRating]                 = useState(0);
  const [showFilters, setShowFilters]             = useState(false);
  const [isLoading, setIsLoading]                 = useState(true);

  useEffect(() => {
    fetch(`${API}/specialties`).then((r) => r.json()).then(setSpecialties).catch(() => {});
  }, []);

  const loadHairdressers = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (cityInput.trim()) params.set('city', cityInput.trim());
    if (selectedSpecialty) params.set('specialty', selectedSpecialty);
    try {
      const res = await fetch(`${API}/hairdressers?${params}`);
      const data: PaginatedResponse<ApiHairdresserProfile> = await res.json();
      setHairdressers(data.data);
    } catch {
      setHairdressers([]);
    }
    setIsLoading(false);
  }, [cityInput, selectedSpecialty]);

  useEffect(() => { loadHairdressers(); }, [loadHairdressers]);

  // Filtre côté client : texte + note minimum
  const filtered = hairdressers.filter((h) => {
    if (query) {
      const q = query.toLowerCase();
      const matches =
        h.user.name.toLowerCase().includes(q) ||
        (h.city ?? '').toLowerCase().includes(q) ||
        h.specialties.some((s) => s.name.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (minRating > 0 && h.reviews_count > 0) {
      if (parseFloat(h.avg_rating) < minRating) return false;
    }
    return true;
  });

  const specialtyMap = Object.fromEntries(specialties.map((s) => [s.slug, s]));
  const orderedSpecialties = SPECIALTY_ORDER.map((sl) => specialtyMap[sl]).filter(Boolean);
  const suggestedCities = extractCities(hairdressers);

  const activeFiltersCount = [cityInput.trim(), minRating > 0 ? 'rating' : ''].filter(Boolean).length;

  function clearAllFilters() {
    setCityInput('');
    setSelectedSpecialty(null);
    setMinRating(0);
    setQuery('');
  }

  // Message état vide contextuel
  function emptyMessage(): string {
    if (selectedSpecialty && cityInput.trim()) {
      const s = specialtyMap[selectedSpecialty];
      return `Aucun spécialiste ${s?.name ?? ''} à ${cityInput.trim()} pour l'instant.`;
    }
    if (selectedSpecialty) {
      const s = specialtyMap[selectedSpecialty];
      return `Aucun coiffeur spécialisé en ${s?.name ?? ''} disponible.`;
    }
    if (cityInput.trim()) return `Aucun coiffeur à ${cityInput.trim()} pour l'instant.`;
    if (query) return `Aucun résultat pour "${query}".`;
    return "Aucun coiffeur disponible pour l'instant.";
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">

        {/* ══════════════════════════════════════════════
            HEADER STICKY
        ══════════════════════════════════════════════ */}
        <div className="sticky top-0 z-20 bg-white">

          {/* Ligne 1 : barre de recherche + bouton filtres */}
          <div className="flex gap-2 px-4 pt-4 pb-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Coiffeur, technique, ville..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`relative flex items-center gap-1.5 px-4 py-3 rounded-2xl border text-sm font-medium transition-all flex-shrink-0 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Filtres</span>
              {activeFiltersCount > 0 && (
                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                  showFilters ? 'bg-white text-neutral-900' : 'bg-white/20 text-white'
                }`}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Ligne 2 : pills spécialités (toujours visible) */}
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

          {/* Panneau filtres avancés (ville + note) */}
          {showFilters && (
            <div className="mx-4 mb-2 bg-neutral-50 border border-neutral-100 rounded-2xl p-4 space-y-5">

              {/* Ville */}
              <div>
                <label className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 block mb-2">
                  Ville
                </label>
                <div className="relative mb-2">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ex : Paris, Lyon, Strasbourg..."
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="w-full pl-8 pr-8 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all"
                  />
                  {cityInput && (
                    <button onClick={() => setCityInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {/* Suggestions de villes */}
                {!cityInput && suggestedCities.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {suggestedCities.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCityInput(c)}
                        className="text-xs text-neutral-500 bg-white border border-neutral-200 px-2.5 py-1 rounded-full hover:border-neutral-400 hover:text-neutral-900 transition-all"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Note minimum */}
              <div>
                <label className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 block mb-2">
                  Note minimum
                </label>
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

              {/* Effacer */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => { setCityInput(''); setMinRating(0); }}
                  className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors underline underline-offset-2"
                >
                  Effacer les filtres avancés
                </button>
              )}
            </div>
          )}

          {/* Chips filtres actifs (quand panneau fermé) */}
          {!showFilters && (cityInput.trim() || minRating > 0) && (
            <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
              {cityInput.trim() && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-full">
                  <MapPin size={11} />
                  {cityInput.trim()}
                  <button onClick={() => setCityInput('')} className="ml-0.5 text-neutral-400 hover:text-neutral-700">
                    <X size={11} />
                  </button>
                </span>
              )}
              {minRating > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-full">
                  <Star size={11} fill="currentColor" />
                  {minRating}+
                  <button onClick={() => setMinRating(0)} className="ml-0.5 text-neutral-400 hover:text-neutral-700">
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Ligne de séparation */}
          <div className="h-px bg-neutral-100 mx-0" />
        </div>

        {/* ══════════════════════════════════════════════
            RÉSULTATS
        ══════════════════════════════════════════════ */}
        <div className="px-4 pt-4 pb-28 md:pb-8">

          {/* Compteur */}
          {!isLoading && filtered.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-neutral-400">
                {filtered.length} coiffeur{filtered.length !== 1 ? 's' : ''}
                {selectedSpecialty && specialtyMap[selectedSpecialty] ? ` · ${specialtyMap[selectedSpecialty].name}` : ''}
                {cityInput.trim() ? ` · ${cityInput.trim()}` : ''}
              </p>
              {(query || selectedSpecialty || cityInput.trim() || minRating > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors"
                >
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
          {!isLoading && filtered.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((h) => (
                <HairdresserCard key={h.id} hairdresser={h} />
              ))}
            </div>
          )}

          {/* État vide */}
          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mx-auto mb-5">
                <Search size={22} className="text-neutral-300" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 mb-2">Aucun résultat</h3>
              <p className="text-sm text-neutral-400 max-w-xs leading-relaxed mb-6">
                {emptyMessage()}
              </p>
              {/* Suggestions */}
              {(selectedSpecialty || cityInput.trim() || query || minRating > 0) && (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={clearAllFilters}
                    className="text-sm font-semibold text-neutral-900 border border-neutral-200 px-5 py-2.5 rounded-xl hover:border-neutral-400 transition-colors"
                  >
                    Voir tous les coiffeurs
                  </button>
                  {selectedSpecialty && (
                    <button
                      onClick={() => setSelectedSpecialty(null)}
                      className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
                    >
                      Retirer le filtre spécialité
                    </button>
                  )}
                </div>
              )}
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
