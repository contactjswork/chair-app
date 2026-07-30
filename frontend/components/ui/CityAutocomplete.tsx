'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { geo, type CitySuggestion } from '@/lib/api';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSelect: (suggestion: CitySuggestion) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Icône affichée dans le champ (ex: MapPin) — rendue ici, jamais par
   *  l'appelant : un icône positionnée en absolute par l'appelant se recentre
   *  sur input+dropdown une fois les suggestions ouvertes (le dropdown est en
   *  flux normal, pas flottant), et finit visuellement entre les deux. */
  icon?: React.ReactNode;
}

/**
 * Champ ville avec autocomplétion réelle (API Adresse — data.gouv.fr, toutes
 * les communes françaises) : taper "Stras" propose Strasbourg avec des
 * coordonnées précises, plutôt qu'un simple texte libre espérant matcher le
 * petit dictionnaire de secours côté backend.
 */
export default function CityAutocomplete({ value, onChange, onSelect, placeholder, className, autoFocus, icon }: Props) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      geo.searchCity(value.trim())
        .then((data) => { if (id === requestIdRef.current) setSuggestions(data.results ?? []); })
        .catch(() => { if (id === requestIdRef.current) setSuggestions([]); })
        .finally(() => { if (id === requestIdRef.current) setLoading(false); });
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleSelect(s: CitySuggestion) {
    onChange(s.city);
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef}>
      <div className="relative">
        {icon}
        <input
          autoFocus={autoFocus}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? 'Paris, Lyon, Strasbourg…'}
          autoComplete="off"
          className={className}
        />
      </div>

      {open && value.trim().length >= 2 && (suggestions.length > 0 || loading) && (
        // En flux normal (pas absolute) : un dropdown flottant se fait couper
        // par le premier ancêtre à overflow:hidden/auto qu'il traverse (ex: la
        // bottom sheet "Votre ville"), ce qui le rend invisible sans scroll —
        // en flux, il pousse simplement le contenu suivant, toujours visible.
        <div className="mt-1.5 bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden max-h-64 overflow-y-auto">
          {loading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-[13px] text-neutral-400">Recherche…</div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={`${s.city}-${s.postcode}-${i}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] hover:bg-neutral-50 transition-colors ${i < suggestions.length - 1 ? 'border-b border-neutral-50' : ''}`}
            >
              <MapPin size={13} className="text-neutral-400 flex-shrink-0" />
              <span className="text-neutral-900 font-medium truncate">{s.city}</span>
              {s.postcode && <span className="ml-auto text-[11px] text-neutral-400 flex-shrink-0">{s.postcode}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
