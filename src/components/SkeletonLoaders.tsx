export function ProductCardSkeleton() {
  return (
    <div
      className="glass-panel rounded-2xl overflow-hidden flex flex-col"
      aria-hidden="true"
    >
      <div className="aspect-[4/3] w-full skeleton-shimmer" />
      <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="h-3 w-1/2 rounded skeleton-shimmer" />
          <div className="h-6 w-4/5 rounded skeleton-shimmer" />
          <div className="h-3.5 w-full rounded skeleton-shimmer" />
          <div className="h-3.5 w-3/4 rounded skeleton-shimmer" />
        </div>
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-2.5 w-14 rounded skeleton-shimmer" />
            <div className="h-5 w-24 rounded skeleton-shimmer" />
          </div>
          <div className="h-9 w-28 rounded-lg skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function CatalogSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
      aria-busy="true"
      aria-label="Loading catalog items"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeleton key={idx} />
      ))}
    </div>
  );
}
