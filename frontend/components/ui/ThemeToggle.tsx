'use client';

import { useState } from 'react';
import { Monitor, Sun, Moon } from 'lucide-react';
import { applyThemeChoice, getThemeChoice, type ThemeChoice } from '@/lib/theme';

/**
 * Bascule d'apparence compacte pour la vitrine (footer) — même préférence
 * chair_theme que les apps : un seul réglage, trois surfaces.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>(() => getThemeChoice());

  const CHOIX: { valeur: ThemeChoice; icone: typeof Sun; label: string }[] = [
    { valeur: 'system', icone: Monitor, label: 'Apparence système' },
    { valeur: 'light',  icone: Sun,     label: 'Apparence claire' },
    { valeur: 'dark',   icone: Moon,    label: 'Apparence sombre' },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full bg-white/5 p-1" role="group" aria-label="Apparence">
      {CHOIX.map(({ valeur, icone: Icone, label }) => (
        <button
          key={valeur}
          onClick={() => { applyThemeChoice(valeur); setTheme(valeur); }}
          aria-label={label}
          aria-pressed={theme === valeur}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            theme === valeur ? 'bg-white/15 text-white' : 'text-neutral-600 hover:text-neutral-400'
          }`}
        >
          <Icone size={14} />
        </button>
      ))}
    </div>
  );
}
