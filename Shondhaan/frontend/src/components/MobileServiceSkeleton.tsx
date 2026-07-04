/**
 * Mobile-only shimmering skeleton for service sections while CMS data loads.
 * Matches the rough card grid layout used on the home page.
 */
const MobileServiceSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="md:hidden px-4 mt-6 space-y-5">
    {[...Array(2)].map((_, sec) => (
      <div key={sec} className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-12 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
              <div className="space-y-2 p-2.5">
                <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default MobileServiceSkeleton;