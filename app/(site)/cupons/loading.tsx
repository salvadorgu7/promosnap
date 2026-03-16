export default function CuponsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-8 bg-surface-100 rounded w-48 mb-2" />
      <div className="h-4 bg-surface-100 rounded w-64 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-surface-100 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-surface-200 rounded w-24" />
              <div className="h-3 bg-surface-200 rounded w-16" />
            </div>
            <div className="h-3 bg-surface-200 rounded w-full" />
            <div className="h-3 bg-surface-200 rounded w-3/4" />
            <div className="h-8 bg-surface-200 rounded w-28 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
