export default function ProdutoLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb skeleton */}
      <div className="animate-pulse flex items-center gap-2 mb-4">
        <div className="h-3 bg-surface-100 rounded w-12" />
        <div className="h-3 bg-surface-100 rounded w-3" />
        <div className="h-3 bg-surface-100 rounded w-24" />
        <div className="h-3 bg-surface-100 rounded w-3" />
        <div className="h-3 bg-surface-100 rounded w-40" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: Image */}
        <div className="lg:col-span-1 space-y-4">
          <div className="animate-pulse bg-surface-100 rounded-lg aspect-square" />
          {/* Specs skeleton */}
          <div className="animate-pulse bg-surface-100 rounded-lg p-4 space-y-3">
            <div className="h-4 bg-surface-200 rounded w-28" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 bg-surface-200 rounded w-20" />
                <div className="h-3 bg-surface-200 rounded w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title skeleton */}
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-surface-100 rounded w-24" />
            <div className="h-8 bg-surface-100 rounded w-full" />
            <div className="h-8 bg-surface-100 rounded w-3/4" />
            <div className="h-3 bg-surface-100 rounded w-full mt-1" />
          </div>

          {/* Best price card skeleton */}
          <div className="animate-pulse bg-surface-100 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 bg-surface-200 rounded w-32" />
                <div className="h-10 bg-surface-200 rounded w-40" />
                <div className="h-3 bg-surface-200 rounded w-28" />
              </div>
              <div className="h-11 bg-surface-200 rounded w-28" />
            </div>
          </div>

          {/* Offers skeleton */}
          <div className="animate-pulse space-y-2">
            <div className="h-5 bg-surface-100 rounded w-48 mb-3" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface-100 rounded-lg p-4 flex items-center gap-4">
                <div className="w-8 h-8 bg-surface-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-200 rounded w-32" />
                  <div className="h-2 bg-surface-200 rounded w-48" />
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-2 bg-surface-200 rounded w-16 ml-auto" />
                  <div className="h-5 bg-surface-200 rounded w-20 ml-auto" />
                </div>
                <div className="h-9 bg-surface-200 rounded w-16" />
              </div>
            ))}
          </div>

          {/* Price history skeleton */}
          <div className="animate-pulse">
            <div className="h-5 bg-surface-100 rounded w-40 mb-3" />
            <div className="bg-surface-100 rounded-lg h-48" />
          </div>
        </div>
      </div>
    </div>
  );
}
