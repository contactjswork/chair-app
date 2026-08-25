// Marquage CSS du shell natif Capacitor — AVANT le premier paint.
//
// Pourquoi une classe sur <html> plutôt que du JS React :
// les règles "app native, pas site web" de globals.css (pas de sélection de
// texte sur l'UI, pas de rebond du document, pas de scrollbar visible…)
// doivent s'appliquer dès le premier rendu, sans flash ni mismatch
// d'hydratation. Un composant client (useEffect/useSyncExternalStore) ne
// s'exécute qu'après l'hydratation : pendant quelques centaines de ms, la
// page se comporterait comme un site web (rubber-band visible au premier
// scroll, flash de sélection). Un <script> inline dans <head>, lui, tourne
// avant le paint du <body>.
//
// La détection repose sur window.Capacitor.isNativePlatform() et PAS sur le
// marqueur User-Agent de lib/appContext.ts : le pont Capacitor est injecté
// par le shell natif en `atDocumentStart`, donc TOUJOURS disponible avant ce
// script — y compris dans les binaires compilés avant l'ajout de
// `appendUserAgent` (contexte 'unknown'), qui sont bien des apps natives et
// doivent recevoir le même traitement CSS. Ici on ne distingue pas CLIENT de
// PRO : les deux binaires veulent le même comportement app-like.
//
// React n'écrase pas la classe à l'hydratation : les attributs du DOM ne
// sont pas re-synchronisés lors de l'hydratation (même mécanique que
// next-themes). La classe posée avant hydratation persiste.

/** Classe posée sur <html> uniquement dans un shell natif Capacitor. */
export const NATIVE_CLASS = 'chair-native';

/**
 * Script inline à injecter dans <head> (layout racine) via
 * dangerouslySetInnerHTML. Volontairement minuscule et sans dépendance.
 */
export const NATIVE_CLASS_BOOTSTRAP =
  `try{var c=window.Capacitor;if(c&&c.isNativePlatform&&c.isNativePlatform()){document.documentElement.classList.add('${NATIVE_CLASS}')}}catch(e){}`;
