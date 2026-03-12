"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}

export function OfferCardSkeleton() {
  return (
    <div className="card flex flex-col w-full overflow-hidden">
      <div className="px-3 pt-3">
        <Skeleton className="aspect-square rounded-lg" />
      </div>
      <div className="px-3 pt-3 pb-3 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="pt-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-24 mt-1" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg mt-3" />
      </div>
    </div>
  );
}

export function PriceChartSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-[220px] w-full rounded-lg" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}
