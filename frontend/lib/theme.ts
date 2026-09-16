// ── Thème clair / sombre ─────────────────────────────────────────────
//
// Décision Julien (16/09/2026) : l'app est TOUJOURS claire par défaut —
// le sombre ne s'active que si l'utilisateur le choisit lui-même. Plus de
// suivi du réglage système : un iPhone en mode sombre n'impose plus sa
// nuit à CHAIR (« si y en a qui l'ont par défaut c'est nul »).
//
// Préférence stockée sous chair_theme : 'light' (défaut) | 'dark'. Une
// ancienne valeur 'system' (ou l'absence de valeur) vaut clair. La classe
// .dark sur <html> pilote tout le remap de palette de globals.css. Posée
// AVANT le premier paint par THEME_BOOTSTRAP (même mécanique que
// NATIVE_CLASS_BOOTSTRAP) pour éviter le flash.

export type ThemeChoice = 'light' | 'dark';

export const THEME_KEY = 'chair_theme';

/** Script inline du <head> — pas d'import, pas de dépendance, jamais
 *  d'exception. Sombre UNIQUEMENT si choisi explicitement. */
export const THEME_BOOTSTRAP =
  `try{if(localStorage.getItem('${THEME_KEY}')==='dark')` +
  `document.documentElement.classList.add('dark')}catch(e){}`;

export function getThemeChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'light';
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {}
  document.documentElement.classList.toggle('dark', choice === 'dark');
}
