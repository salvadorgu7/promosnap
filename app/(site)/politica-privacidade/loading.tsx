"use client"

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-surface-100 rounded w-1/3" />
        <div className="h-4 bg-surface-100 rounded w-2/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-surface-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
