export default function PrecoLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-4 bg-surface-200 rounded w-48 mb-6" />
      <div className="h-8 bg-surface-200 rounded w-96 mb-2" />
      <div className="h-4 bg-surface-200 rounded w-32 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-3 bg-surface-200 rounded w-20 mb-2" />
            <div className="h-6 bg-surface-200 rounded w-24" />
          </div>
        ))}
      </div>
      <div className="card p-6 mb-8">
        <div className="h-5 bg-surface-200 rounded w-48 mb-4" />
        <div className="h-64 bg-surface-100 rounded" />
      </div>
      <div className="card p-6">
        <div className="h-5 bg-surface-200 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-surface-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
