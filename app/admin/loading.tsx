"use client";

export default function AdminLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="h-8 w-48 bg-surface-100 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface-100 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-surface-100 rounded-xl" />
      <div className="h-40 bg-surface-100 rounded-xl" />
    </div>
  );
}
