export default function OfertaDetalheLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-3 bg-surface-100 rounded w-40 mb-4" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-surface-100 rounded-xl" />
        <div className="space-y-4">
          <div className="h-7 bg-surface-100 rounded w-3/4" />
          <div className="h-4 bg-surface-100 rounded w-1/2" />
          <div className="h-10 bg-surface-100 rounded w-40 mt-4" />
          <div className="h-4 bg-surface-100 rounded w-full mt-6" />
          <div className="h-4 bg-surface-100 rounded w-5/6" />
          <div className="h-12 bg-surface-200 rounded-lg w-full mt-4" />
        </div>
      </div>
    </div>
  );
}
