export default function GuiaCompraLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-3 bg-surface-100 rounded w-40 mb-4" />
      <div className="h-8 bg-surface-100 rounded w-72 mb-3" />
      <div className="h-4 bg-surface-100 rounded w-full mb-8" />
      <div className="bg-surface-100 rounded-xl p-6 space-y-3 mb-6">
        <div className="h-5 bg-surface-200 rounded w-44" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 bg-surface-200 rounded-full" />
            <div className="h-3 bg-surface-200 rounded w-48" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 bg-surface-100 rounded w-full" />
        ))}
      </div>
    </div>
  );
}
