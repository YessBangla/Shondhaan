import { cn } from "@/lib/utils";

interface Props {
  online?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Reusable online/offline status indicator with pulsing animation when online.
 * Uses semantic colors only (no raw hex).
 */
export default function ProviderStatusDot({
  online = false,
  size = "md",
  showLabel = false,
  className,
}: Props) {
  const sizeMap = { sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3" };
  const bn = (localStorage.getItem("yess_lang") || "bn") === "bn";

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-flex">
        <span
          className={cn(
            "rounded-full",
            sizeMap[size],
            online ? "bg-green-500" : "bg-muted-foreground/40"
          )}
        />
        {online && (
          <span
            className={cn(
              "absolute inset-0 rounded-full bg-green-500/60 animate-ping",
              sizeMap[size]
            )}
          />
        )}
      </span>
      {showLabel && (
        <span
          className={cn(
            "text-xs font-medium",
            online ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
          )}
        >
          {online ? (bn ? "অনলাইন" : "Online") : bn ? "অফলাইন" : "Offline"}
        </span>
      )}
    </span>
  );
}
