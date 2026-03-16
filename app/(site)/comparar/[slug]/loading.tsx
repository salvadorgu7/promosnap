export default function CompararLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-7 bg-surface-100 rounded w-60 mb-2" />
      <div className="h-4 bg-surface-100 rounded w-80 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-100 rounded-xl p-4 space-y-4">
            <div className="aspect-square bg-surface-200 rounded-lg" />
            <div className="h-4 bg-surface-200 rounded w-3/4" />
            <div className="h-6 bg-surface-200 rounded w-1/2" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-3 bg-surface-200 rounded w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
