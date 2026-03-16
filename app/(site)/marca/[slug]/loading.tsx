export default function MarcaLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-surface-200 rounded-xl" />
        <div>
          <div className="h-7 bg-surface-100 rounded w-40 mb-2" />
          <div className="h-4 bg-surface-100 rounded w-56" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-surface-100 rounded-lg overflow-hidden">
            <div className="aspect-square bg-surface-200" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-surface-200 rounded w-full" />
              <div className="h-3 bg-surface-200 rounded w-3/4" />
              <div className="h-5 bg-surface-200 rounded w-1/2 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
