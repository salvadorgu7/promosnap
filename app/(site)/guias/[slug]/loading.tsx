export default function GuiaLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-3 bg-surface-100 rounded w-32 mb-4" />
      <div className="h-8 bg-surface-100 rounded w-80 mb-3" />
      <div className="h-4 bg-surface-100 rounded w-full mb-8" />
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-surface-100 rounded w-full" />
        ))}
        <div className="h-4 bg-surface-100 rounded w-3/4" />
      </div>
    </div>
  );
}
