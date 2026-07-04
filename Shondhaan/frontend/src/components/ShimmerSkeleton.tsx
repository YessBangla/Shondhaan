import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  rounded?: string;
}

const ShimmerSkeleton = ({ className = "", rounded = "rounded-md" }: Props) => (
  <div
    className={cn(
      "relative overflow-hidden bg-muted/60",
      rounded,
      className
    )}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
  </div>
);

export default ShimmerSkeleton;