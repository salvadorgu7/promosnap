export default function CategoriasLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-8 bg-surface-100 rounded w-44 mb-2" />
      <div className="h-4 bg-surface-100 rounded w-56 mb-6" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-surface-100 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-surface-200 rounded-lg" />
            <div className="h-3 bg-surface-200 rounded w-16" />
            <div className="h-2 bg-surface-200 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
