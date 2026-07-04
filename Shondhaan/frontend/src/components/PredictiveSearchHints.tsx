import { useEffect, useMemo, useState } from "react";
import { Sparkles, TrendingUp, Clock } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

interface Props {
  query: string;
  onPick: (slug: string, title: string) => void;
  trending?: { slug: string; title: string }[];
  className?: string;
}

const RECENT_KEY = "yess_recent_searches";

/**
 * Predictive search hint panel — surfaces recent searches, trending picks,
 * and AI-style autocomplete predictions even before the user finishes typing.
 */
export default function PredictiveSearchHints({ query, onPick, trending = [], className }: Props) {
  const { items: recentlyViewed } = useRecentlyViewed();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const bn = (typeof window !== "undefined" && (localStorage.getItem("yess_lang") || "bn") === "bn");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentSearches(JSON.parse(raw).slice(0, 5));
    } catch {}
  }, []);

  const predictions = useMemo(() => {
    if (!query.trim() || query.length < 1) return [];
    const q = query.toLowerCase();
    return recentlyViewed
      .filter((r) => r.title.toLowerCase().includes(q) || r.titleEn?.toLowerCase().includes(q))
      .slice(0, 4);
  }, [query, recentlyViewed]);

  const showRecent = !query && recentSearches.length > 0;
  const showTrending = !query && trending.length > 0;
  const showPredictions = predictions.length > 0;

  if (!showRecent && !showTrending && !showPredictions) return null;

  return (
    <div className={`rounded-2xl border border-border bg-popover p-3 shadow-lg ${className || ""}`}>
      {showPredictions && (
        <div className="mb-2">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            {bn ? "AI সাজেশন" : "AI suggestions"}
          </p>
          <ul className="space-y-1">
            {predictions.map((p) => (
              <li key={p.slug}>
                <button
                  onClick={() => onPick(p.slug, p.title)}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {bn ? p.title : p.titleEn || p.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showTrending && (
        <div className="mb-2">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {bn ? "ট্রেন্ডিং" : "Trending"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {trending.slice(0, 6).map((t) => (
              <button
                key={t.slug}
                onClick={() => onPick(t.slug, t.title)}
                className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {showRecent && (
        <div>
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3 w-3" />
            {bn ? "সাম্প্রতিক" : "Recent"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((r, i) => (
              <button
                key={`${r}-${i}`}
                onClick={() => onPick("", r)}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground hover:bg-muted/70"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
