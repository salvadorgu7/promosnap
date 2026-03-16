export default function ValeAPenaLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-8 bg-surface-100 rounded w-72 mb-3" />
      <div className="h-4 bg-surface-100 rounded w-96 mb-8" />
      <div className="bg-surface-100 rounded-xl p-6 space-y-4 mb-8">
        <div className="aspect-video bg-surface-200 rounded-lg" />
        <div className="h-4 bg-surface-200 rounded w-full" />
        <div className="h-4 bg-surface-200 rounded w-5/6" />
        <div className="h-4 bg-surface-200 rounded w-4/6" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
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
  );
}
