export default function DescobrirLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-3 w-48 bg-surface-200 rounded mb-4" />

      {/* Title skeleton */}
      <div className="h-7 w-72 bg-surface-200 rounded mb-2" />
      <div className="h-4 w-56 bg-surface-100 rounded mb-6" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-surface-200 p-3">
            <div className="h-32 bg-surface-100 rounded-lg mb-3" />
            <div className="h-3 w-full bg-surface-200 rounded mb-2" />
            <div className="h-5 w-20 bg-surface-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
