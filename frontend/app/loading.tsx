export default function Loading() {
  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Hero skeleton */}
      <div className="min-h-[88svh] md:min-h-screen flex flex-col justify-end px-5 pb-10 md:pb-16">
        <div className="h-3 w-40 bg-white/10 rounded-full animate-pulse mb-4" />
        <div className="h-10 w-3/4 bg-white/10 rounded-2xl animate-pulse mb-2" />
        <div className="h-10 w-1/2 bg-white/10 rounded-2xl animate-pulse mb-6" />
        <div className="h-14 bg-white/10 rounded-2xl animate-pulse max-w-xl" />
      </div>

      {/* Specialties skeleton */}
      <div className="bg-white px-4 py-6 flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex-shrink-0 w-[76px] h-[76px] rounded-2xl bg-neutral-100 animate-pulse" />
        ))}
      </div>

      {/* Feed skeleton */}
      <div className="bg-white px-3 pt-6 pb-4">
        <div className="h-3 w-32 bg-neutral-100 rounded-full animate-pulse mb-3 mx-1" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
