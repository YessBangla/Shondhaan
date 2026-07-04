/**
 * Reusable shimmering placeholder mirroring ServiceSection cards.
 * Use anywhere CMS / fetched service data is loading for a Daraz/Sheba-style
 * perceived-speed boost.
 */
const ServiceCardSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
        <div className="space-y-2 p-3">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="flex items-center justify-between pt-1">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default ServiceCardSkeleton;