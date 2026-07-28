// Bloc de chargement partagé — remplace les `bg-neutral-200 rounded-2xl
// animate-pulse` recréés à la main avec des tailles incohérentes. `Skeleton`
// pour un bloc simple, `SkeletonText` pour une ligne de texte (hauteur/rayon
// calés sur la typo réelle plutôt qu'un rectangle générique).

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-neutral-100 rounded-2xl animate-pulse ${className}`} />;
}

export function SkeletonText({ width = 'w-full', className = '' }: { width?: string; className?: string }) {
  return <div className={`h-3.5 rounded-full bg-neutral-100 animate-pulse ${width} ${className}`} />;
}

export function SkeletonCircle({ size = 'w-10 h-10', className = '' }: { size?: string; className?: string }) {
  return <div className={`rounded-full bg-neutral-100 animate-pulse ${size} ${className}`} />;
}
