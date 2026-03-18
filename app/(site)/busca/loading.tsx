export default function BuscaLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header skeleton */}
      <div className="mb-6 animate-pulse">
        <div className="h-7 bg-surface-100 rounded w-72 mb-2" />
        <div className="h-3 bg-surface-100 rounded w-40" />
      </div>

      <div className="flex gap-6">
        {/* Sidebar filter skeleton (desktop) */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="animate-pulse bg-surface-100 rounded-lg p-4 space-y-4">
            <div className="h-4 bg-surface-200 rounded w-20" />
            <div className="space-y-2">
              <div className="h-3 bg-surface-200 rounded w-32" />
              <div className="flex gap-2">
                <div className="h-8 bg-surface-200 rounded flex-1" />
                <div className="h-8 bg-surface-200 rounded flex-1" />
                <div className="h-8 bg-surface-200 rounded w-10" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-surface-200 rounded w-16" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-surface-200 rounded" />
                  <div className="h-3 bg-surface-200 rounded w-20" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Results skeleton */}
        <div className="flex-1 min-w-0">
          {/* Sort bar skeleton */}
          <div className="animate-pulse mb-4 p-3 rounded-lg bg-surface-100 border border-surface-200">
            <div className="flex items-center gap-2">
              <div className="h-3 bg-surface-200 rounded w-16" />
              <div className="flex gap-1 ml-auto">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-7 bg-surface-200 rounded w-20" />
                ))}
              </div>
            </div>
          </div>

          {/* Product grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
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
        </div>
      </div>
    </div>
  );
}
