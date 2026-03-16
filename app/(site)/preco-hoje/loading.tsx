export default function PrecoHojeLoading() {
  const CardSkeleton = () => (
    <div className="animate-pulse bg-surface-100 rounded-lg overflow-hidden">
      <div className="aspect-square bg-surface-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-surface-200 rounded w-full" />
        <div className="h-3 bg-surface-200 rounded w-3/4" />
        <div className="h-5 bg-surface-200 rounded w-1/2 mt-2" />
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-surface-100 rounded w-64 mb-2" />
        <div className="h-4 bg-surface-100 rounded w-96" />
      </div>

      {/* Section 1 — Hot offers */}
      <div>
        <div className="animate-pulse h-6 bg-surface-100 rounded w-40 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Section 2 — Lowest prices */}
      <div>
        <div className="animate-pulse h-6 bg-surface-100 rounded w-44 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Section 3 — Recently imported */}
      <div>
        <div className="animate-pulse h-6 bg-surface-100 rounded w-36 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
