/**
 * Le langage visuel de CHAIR PRO — une seule main sur tous les écrans.
 *
 * Né sur la home puis appliqué partout : tant que chaque écran recopiait ses
 * propres ombres, ils divergeaient (le bas de la home en gros titres plats,
 * les listes en gris, la carte sombre sans lumière). Ces constantes sont la
 * source unique ; un écran qui les importe ne peut plus dériver.
 *
 * Les principes, pour ne pas les réinventer à chaque écran :
 *
 * - Deux ombres superposées, jamais une seule : une ombre de CONTACT très
 *   courte qui pose l'objet, une ombre AMBIANTE large et diffuse qui lui
 *   donne du volume. Une seule ombre donne un carton découpé.
 * - La lumière vient d'en haut : les surfaces sombres portent un liseré
 *   clair sur l'arête haute et un dégradé radial imperceptible.
 * - Ce qui est en retrait (rails de progression) est CREUSÉ — ombre interne,
 *   pas une barre grise posée là.
 *
 * Tailwind lit ces chaînes dans ce fichier comme dans du JSX : les classes
 * doivent rester des littéraux complets, jamais assemblées par morceaux.
 */

/** Carte claire posée sur le fond — le conteneur par défaut de tout contenu. */
export const CARTE =
  'rounded-[28px] bg-white ring-1 ring-neutral-100 shadow-[0_1px_2px_rgba(10,10,10,0.04),0_10px_26px_-14px_rgba(10,10,10,0.14)]';

/** Variante interactive : la carte s'enfonce légèrement sous le doigt. */
export const CARTE_TAP = `${CARTE} active:scale-[0.985] transition-transform duration-200`;

/** Surface sombre du héros — dégradé éclairé par le haut + liseré + volume. */
export const CARTE_SOMBRE =
  'rounded-[28px] bg-neutral-900 bg-[radial-gradient(120%_100%_at_50%_0%,#1f1f21_0%,#0a0a0a_62%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_4px_-2px_rgba(10,10,10,0.4),0_16px_40px_-18px_rgba(10,10,10,0.55)]';

export const CARTE_SOMBRE_TAP = `${CARTE_SOMBRE} active:scale-[0.985] transition-transform duration-200`;

/** Rail de progression vide — un sillon creusé, pas une barre grise. */
export const RAIL_CREUX = 'bg-neutral-100 shadow-[inset_0_1px_2px_rgba(10,10,10,0.08)]';

/** La partie remplie du rail, posée dans le sillon. */
export const RAIL_PLEIN = 'bg-neutral-900 shadow-[0_1px_3px_rgba(10,10,10,0.35)]';

/** Micro-titre de carte : « AUJOURD'HUI », « MA VITRINE »… */
export const MICRO_TITRE = 'text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400';

/** Micro-titre sur surface sombre. */
export const MICRO_TITRE_SOMBRE = 'text-[10px] font-bold uppercase tracking-[0.18em] text-white/40';
