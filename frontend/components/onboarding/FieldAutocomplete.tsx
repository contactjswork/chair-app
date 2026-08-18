'use client';

import { useEffect, useRef, useState } from 'react';

interface Props<T> {
  value: string;
  onChange: (text: string) => void;
  onSelect: (item: T) => void;
  /** Peut être async (API) ou sync (filtrage local, ex. liste de pays). */
  fetchSuggestions: (query: string) => Promise<T[]> | T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getSublabel?: (item: T) => string | null | undefined;
  /** Nombre de caractères avant de proposer des suggestions (1 pour un
   *  filtrage local instantané comme les pays, 2-3 pour une API distante). */
  minChars?: number;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
  onKeyDownEnter?: () => void;
  /** 'dark' pour l'inscription, 'light' pour l'onboarding post-inscription. */
  theme?: 'dark' | 'light';
}

/**
 * Champ texte + suggestions génériques — utilisé par LocationAccordion pour
 * Pays (filtrage local), Ville et Adresse (API Adresse data.gouv.fr). Même
 * esprit que components/ui/CityAutocomplete.tsx mais paramétré sur le type
 * d'item pour être réutilisable sur les 3 champs sans dupliquer le
 * dropdown/debounce/clic-extérieur à chaque fois.
 */
export default function FieldAutocomplete<T>({
  value, onChange, onSelect, fetchSuggestions, getKey, getLabel, getSublabel,
  minChars = 2, placeholder, className, autoFocus, onBlur, onKeyDownEnter, theme = 'dark',
}: Props<T>) {
  const isDark = theme === 'dark';
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < minChars) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      Promise.resolve(fetchSuggestions(value.trim()))
        .then((data) => { if (id === requestIdRef.current) setSuggestions(data); })
        .catch(() => { if (id === requestIdRef.current) setSuggestions([]); })
        .finally(() => { if (id === requestIdRef.current) setLoading(false); });
    }, 200);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, minChars]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleSelect(item: T) {
    onSelect(item);
    setSuggestions([]);
    setOpen(false);
  }

  const dropdownCls = isDark
    ? 'mt-1.5 bg-neutral-950 rounded-2xl border border-neutral-700 overflow-hidden max-h-56 overflow-y-auto'
    : 'mt-1.5 bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden max-h-56 overflow-y-auto';
  const itemCls = isDark
    ? 'w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] text-white hover:bg-neutral-900 transition-colors'
    : 'w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] text-neutral-900 hover:bg-neutral-50 transition-colors';

  return (
    <div ref={containerRef}>
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={(e) => { if (e.key === 'Enter' && onKeyDownEnter) onKeyDownEnter(); }}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />

      {open && value.trim().length >= minChars && (suggestions.length > 0 || loading) && (
        <div className={dropdownCls}>
          {loading && suggestions.length === 0 && (
            <div className={`px-4 py-3 text-[13px] ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>Recherche…</div>
          )}
          {suggestions.map((item, i) => {
            const sublabel = getSublabel?.(item);
            return (
              <button
                key={getKey(item)}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                className={`${itemCls} ${i < suggestions.length - 1 ? (isDark ? 'border-b border-neutral-800' : 'border-b border-neutral-50') : ''}`}
              >
                <span className="font-medium truncate">{getLabel(item)}</span>
                {sublabel && <span className={`ml-auto text-[11px] flex-shrink-0 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{sublabel}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
