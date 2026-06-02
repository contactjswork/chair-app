'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, User, Scissors, Navigation } from 'lucide-react';
import { search } from '@/lib/api';
import type { ApiSearchSuggestion } from '@/lib/types';

const TYPE_ICON: Record<string, React.ReactNode> = {
  specialty: <Scissors size={13} className="text-neutral-400" />,
  hairdresser: <User size={13} className="text-neutral-400" />,
  city: <MapPin size={13} className="text-neutral-400" />,
  location: <Navigation size={13} className="text-neutral-400" />,
  service: <Scissors size={13} className="text-neutral-400" />,
};

export default function HeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<ApiSearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await search.suggestions(q);
      setSuggestions(res.suggestions);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, fetchSuggestions]);

  // Fermer sur clic externe
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function navigateToSuggestion(s: ApiSearchSuggestion) {
    setShowSuggestions(false);
    if (s.type === 'specialty' && s.slug) {
      router.push(`/rechercher?specialty=${s.slug}`);
    } else if (s.type === 'hairdresser' && s.slug) {
      router.push(`/coiffeur/${s.slug}`);
    } else if (s.type === 'city') {
      router.push(`/rechercher?city=${encodeURIComponent(s.value)}`);
    } else {
      router.push(`/rechercher?q=${encodeURIComponent(s.value)}`);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      navigateToSuggestion(suggestions[activeIdx]);
      return;
    }
    const path = value.trim()
      ? `/rechercher?q=${encodeURIComponent(value.trim())}`
      : '/rechercher';
    router.push(path);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Escape') { setShowSuggestions(false); setActiveIdx(-1); }
  }

  return (
    <div ref={containerRef} className="w-full max-w-xl mx-auto relative">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/20">
          <Search size={17} className="ml-4 text-neutral-400 flex-shrink-0" />
          <input
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setShowSuggestions(true); setActiveIdx(-1); }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Balayage, Barber, Lyon..."
            className="flex-1 pl-3 pr-2 py-4 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none bg-transparent"
            autoComplete="off"
          />
          <button
            type="submit"
            className="m-2 bg-neutral-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors flex-shrink-0"
          >
            Rechercher
          </button>
        </div>
      </form>

      {/* Dropdown suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <button
              key={`${s.type}-${s.value}-${i}`}
              onMouseDown={(e) => { e.preventDefault(); navigateToSuggestion(s); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                i === activeIdx ? 'bg-neutral-50' : 'hover:bg-neutral-50'
              } ${i < suggestions.length - 1 ? 'border-b border-neutral-50' : ''}`}
            >
              <span className="flex-shrink-0">{TYPE_ICON[s.type] ?? <Search size={13} className="text-neutral-400" />}</span>
              <span className="text-neutral-900 font-medium">{s.label}</span>
              <span className="ml-auto text-[10px] font-semibold tracking-wider uppercase text-neutral-300">
                {s.type === 'specialty' ? 'Spécialité' :
                 s.type === 'hairdresser' ? 'Coiffeur' :
                 s.type === 'city' ? 'Ville' :
                 s.type === 'location' ? 'Région' : 'Service'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
