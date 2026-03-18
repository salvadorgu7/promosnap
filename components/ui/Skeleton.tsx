"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}

export function OfferCardSkeleton() {
  return (
    <div className="card flex flex-col w-full h-full overflow-hidden">
      {/* Matches OfferCard badges area */}
      <div className="flex items-center gap-1 px-1.5 pt-1.5">
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      {/* Matches OfferCard image: px-1.5 pt-1.5 + aspect-[5/4] */}
      <div className="px-1.5 pt-1.5">
        <Skeleton className="aspect-[5/4] rounded-lg" />
      </div>
      {/* Matches OfferCard content: px-1.5 pt-1.5 pb-2 */}
      <div className="flex-1 flex flex-col px-1.5 pt-1.5 pb-2 space-y-2">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <div className="mt-auto pt-2 space-y-1.5">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg mt-2" />
      </div>
    </div>
  );
}

export function PriceChartSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <Skeleton className="h-4 w-20 rounded-md" />
      </div>
      <Skeleton className="h-[220px] w-full rounded-lg" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-8 w-64 rounded-md" />
      <Skeleton className="h-4 w-96 rounded-md" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 rounded-md ${i === 0 ? "w-32" : "w-20"}`} />
        </td>
      ))}
    </tr>
  );
}

export function RailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-3 w-52 rounded-md mt-1" />
          </div>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rail-card flex-shrink-0">
              <OfferCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
