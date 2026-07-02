import AppShell from '@/components/layout/AppShell';

export default function HairdresserProfileLoading() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {/* Bannière skeleton */}
        <div className="h-56 md:h-72 bg-neutral-100 animate-pulse md:rounded-2xl md:mx-4 md:mt-4" />

        <div className="px-4 mt-4">
          {/* Avatar + nom */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-20 h-20 rounded-2xl bg-neutral-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-36 bg-neutral-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-neutral-100 rounded animate-pulse" />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-2 mb-5">
            <div className="flex-1 h-12 bg-neutral-100 rounded-xl animate-pulse" />
            <div className="flex-1 h-12 bg-neutral-100 rounded-xl animate-pulse" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-neutral-50 rounded-xl p-3">
                <div className="h-5 bg-neutral-200 rounded animate-pulse mb-1" />
                <div className="h-3 bg-neutral-100 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Bio */}
          <div className="space-y-2 mb-5">
            <div className="h-3 w-full bg-neutral-100 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-neutral-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
