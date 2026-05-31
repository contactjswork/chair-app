import AppShell from '@/components/layout/AppShell';

export default function RealisationLoading() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-20 animate-pulse">
        {/* Header nav skeleton */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <div className="h-4 w-28 bg-neutral-100 rounded" />
          <div className="h-4 w-16 bg-neutral-100 rounded" />
        </div>

        {/* Image skeleton */}
        <div className="w-full aspect-square bg-neutral-100" />

        {/* Info skeleton */}
        <div className="px-4 pt-5 pb-4 border-b border-neutral-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-100" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 bg-neutral-100 rounded" />
              <div className="h-3 w-20 bg-neutral-100 rounded" />
            </div>
          </div>
          <div className="h-6 w-24 bg-neutral-100 rounded-full" />
          <div className="h-4 w-full bg-neutral-100 rounded" />
          <div className="h-4 w-3/4 bg-neutral-100 rounded" />
        </div>
      </div>
    </AppShell>
  );
}
