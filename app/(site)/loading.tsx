export default function SiteLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Hero skeleton */}
      <div className="animate-pulse rounded-xl bg-surface-100 h-48 w-full" />

      {/* Section title */}
      <div className="animate-pulse">
        <div className="h-6 bg-surface-100 rounded w-48 mb-2" />
        <div className="h-3 bg-surface-100 rounded w-64" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-surface-100 rounded-lg overflow-hidden">
            <div className="aspect-square bg-surface-200" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-surface-200 rounded w-full" />
              <div className="h-3 bg-surface-200 rounded w-3/4" />
              <div className="h-5 bg-surface-200 rounded w-1/2 mt-2" />
              <div className="h-3 bg-surface-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>

      {/* Second section */}
      <div className="animate-pulse">
        <div className="h-6 bg-surface-100 rounded w-40 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface-100 rounded-lg overflow-hidden">
              <div className="aspect-square bg-surface-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-surface-200 rounded w-full" />
                <div className="h-5 bg-surface-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
