// ── Thème clair / sombre ─────────────────────────────────────────────
//
// Préférence stockée sous chair_theme : 'system' (défaut) | 'light' |
// 'dark'. La classe .dark sur <html> pilote tout le remap de palette de
// globals.css. Posée AVANT le premier paint par THEME_BOOTSTRAP (même
// mécanique que NATIVE_CLASS_BOOTSTRAP) pour éviter le flash blanc.

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_KEY = 'chair_theme';

/** Script inline du <head> — pas d'import, pas de dépendance, jamais d'exception. */
export const THEME_BOOTSTRAP =
  `try{var t=localStorage.getItem('${THEME_KEY}');` +
  `var d=t==='dark'||((t===null||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);` +
  `if(d)document.documentElement.classList.add('dark')}catch(e){}`;

export function getThemeChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {}
  const sombre =
    choice === 'dark' ||
    (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', sombre);
}
