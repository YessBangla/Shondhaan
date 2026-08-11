import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, Loader2 } from "lucide-react";
import { useAITools } from "@/hooks/useAITools";
import { useLanguage } from "@/contexts/LanguageContext";

interface Review { rating: number; comment: string | null; }
interface Props { reviews: Review[]; productName: string; cacheKey?: string; }

/**
 * Glassy collapsible card that shows an AI-generated summary of all
 * reviews. Lazy: nothing is called until the user expands it. Cached
 * per `cacheKey` in sessionStorage so re-opening is instant.
 */
const AIReviewSummary = ({ reviews, productName, cacheKey }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { summarizeReviews, loading } = useAITools();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const key = cacheKey ? `yess_ai_review_${cacheKey}_${language}` : undefined;

  useEffect(() => {
    if (!open || summary || reviews.length < 2) return;
    if (key) {
      const cached = sessionStorage.getItem(key);
      if (cached) { setSummary(cached); return; }
    }
    summarizeReviews(reviews, productName).then((res) => {
      if (res) {
        setSummary(res);
        if (key) try { sessionStorage.setItem(key, res); } catch {}
      }
    });
  }, [open, reviews, productName, summary, summarizeReviews, key]);

  if (reviews.length < 2) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              {bn ? "AI রিভিউ সারাংশ" : "AI review summary"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {bn ? `${reviews.length}টি রিভিউয়ের ভিত্তিতে` : `Based on ${reviews.length} reviews`}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} className="text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-primary/15"
          >
            <div className="px-4 py-3 text-sm leading-relaxed text-foreground">
              {loading && !summary ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {bn ? "সারাংশ তৈরি হচ্ছে…" : "Generating summary…"}
                </div>
              ) : summary ? (
                <p className="whitespace-pre-line">{summary}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {bn ? "সারাংশ পাওয়া যায়নি" : "Summary unavailable right now."}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIReviewSummary;