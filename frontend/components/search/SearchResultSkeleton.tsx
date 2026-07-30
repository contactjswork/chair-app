import { Skeleton, SkeletonCircle, SkeletonText } from '@/components/ui/Skeleton';

/**
 * Squelette de chargement calé sur la géométrie réelle de SearchResultCard
 * (photo ronde 68px, 4 lignes, rail de note à droite). Avant, la page et son
 * fallback Suspense recréaient chacun leur propre bloc `animate-pulse` avec des
 * tailles différentes et un carré à la place du rond : le contenu « sautait »
 * au moment où les vrais résultats arrivaient.
 */
export default function SearchResultSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-2xl border border-neutral-100">
          <SkeletonCircle size="w-[68px] h-[68px]" className="flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2 pt-0.5">
            <SkeletonText width="w-2/5" />
            <SkeletonText width="w-3/5" className="h-3" />
            <SkeletonText width="w-1/2" className="h-3" />
          </div>
          <div className="flex flex-col items-end justify-end flex-shrink-0">
            <Skeleton className="w-8 h-4 rounded-md" />
            <Skeleton className="w-10 h-2.5 rounded-full mt-1.5" />
          </div>
        </div>
      ))}
    </div>
  );
}
