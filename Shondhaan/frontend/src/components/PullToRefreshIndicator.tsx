import { Loader2, ArrowDown } from "lucide-react";

interface Props {
  pull: number;
  refreshing: boolean;
  threshold?: number;
}

/**
 * Minimal Daraz-style pull-to-refresh indicator. Renders only when there's
 * an active pull gesture so it stays out of the layout otherwise.
 */
const PullToRefreshIndicator = ({ pull, refreshing, threshold = 70 }: Props) => {
  if (pull <= 0 && !refreshing) return null;
  const progress = Math.min(1, pull / threshold);
  const ready = pull >= threshold;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[60] flex justify-center md:hidden"
      style={{ transform: `translateY(${refreshing ? 24 : Math.min(pull, 90) - 30}px)` }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-lg ring-1 ring-border">
        {refreshing ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <ArrowDown
            className="h-4 w-4 text-primary transition-transform"
            style={{ transform: `rotate(${ready ? 180 : progress * 180}deg)`, opacity: 0.4 + progress * 0.6 }}
          />
        )}
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;