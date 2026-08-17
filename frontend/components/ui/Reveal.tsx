'use client';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Neutralisé sur demande explicite de Julien — l'animation fade+slide au
 * scroll (IntersectionObserver, seuil 0.15) restait bloquée à mi-chemin
 * (opacity-0/translate-y-6) sur un scroll rapide vers le bas sur iPhone :
 * l'observer ne détectait pas toujours l'intersection à temps, laissant des
 * cartes/pastilles à moitié affichées. Plutôt que patcher l'observer, on
 * neutralise le composant lui-même : rendu direct, aucune transition, aucun
 * état intermédiaire possible. Signature conservée (children/className/delay)
 * pour ne toucher aucun des 7 appelants — `delay` n'est simplement plus
 * utilisé.
 */
export default function Reveal({ children, className = '' }: RevealProps) {
  return <div className={className}>{children}</div>;
}
