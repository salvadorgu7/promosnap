export default function MarcasLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-surface-100 rounded w-56 mb-2" />
        <div className="h-4 bg-surface-100 rounded w-80" />
      </div>

      {/* Letter index */}
      <div className="animate-pulse flex gap-2 flex-wrap">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-8 w-8 bg-surface-100 rounded" />
        ))}
      </div>

      {/* Brand groups */}
      {Array.from({ length: 4 }).map((_, g) => (
        <div key={g} className="animate-pulse">
          <div className="h-6 bg-surface-100 rounded w-8 mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface-100 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
