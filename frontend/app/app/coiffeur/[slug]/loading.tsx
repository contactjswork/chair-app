import AppShell from '@/components/layout/AppShell';
import { Skeleton, SkeletonText, SkeletonCircle } from '@/components/ui/Skeleton';

// Le squelette doit décrire *exactement* la page qui arrive, sinon la
// transition chargement → contenu produit un saut de mise en page très
// visible. L'ancienne version décrivait un écran qui n'existe plus
// (max-w-3xl, bannière 224px, avatar carré, grille de 4 stats absente de la
// fiche) : les mesures ci-dessous sont calées sur PublicProfileHero /
// PublicProfileIdentity.
export default function HairdresserProfileLoading() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-32">
        {/* Bannière — même hauteur que PublicProfileHero */}
        <div className="w-full bg-neutral-100 animate-pulse" style={{ height: '168px' }} />

        <div className="px-4">
          {/* Avatar chevauchant + nom / ville, calé sur PublicProfileIdentity */}
          <div className="flex items-end gap-3.5 -mt-11 mb-5 relative z-10">
            <div className="w-[78px] h-[78px] rounded-full bg-neutral-100 border-4 border-white animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2 pb-1">
              <SkeletonText width="w-40" />
              <SkeletonText width="w-28" className="h-3" />
            </div>
          </div>

          {/* Bandeau note / avis / abonnés */}
          <div className="grid grid-cols-3 border-y border-neutral-100 py-3 mb-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <SkeletonText width="w-8" />
                <SkeletonText width="w-12" className="h-2.5" />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-6">
            <Skeleton className="flex-1 h-[46px]" />
            <SkeletonCircle size="w-11 h-11" />
            <SkeletonCircle size="w-11 h-11" />
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-6 px-4 border-b border-neutral-100 pb-3 mb-6">
          {['w-16', 'w-14', 'w-10', 'w-12'].map((w) => (
            <SkeletonText key={w} width={w} className="h-3" />
          ))}
        </div>

        {/* Grille portfolio */}
        <div className="grid grid-cols-3 gap-0.5 px-4 md:px-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
