export default function TrendingLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-surface-100 rounded w-48 mb-2" />
        <div className="h-4 bg-surface-100 rounded w-72" />
      </div>

      {/* Trending list */}
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 bg-surface-100 rounded-lg p-4">
            <div className="h-8 w-8 bg-surface-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-200 rounded w-2/3" />
              <div className="h-3 bg-surface-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
