import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Share2, X, Search, ShoppingBag, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";

/**
 * Receives content from the OS share-sheet via the Web Share Target API.
 * Manifest is configured to POST shared text/url/title to /?share-target=1
 * — we intercept that, surface a quick-action sheet, and route the user
 * to search, deal posting, or mart search depending on choice.
 */
const ShareTargetReceiver = () => {
  const loc = useLocation();
  const nav = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [shared, setShared] = useState<{ title: string; text: string; url: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    if (!params.has("share-target")) return;
    const title = params.get("title") || "";
    const text = params.get("text") || "";
    const url = params.get("url") || "";
    if (!title && !text && !url) return;
    haptic("light");
    setShared({ title, text, url });
    // Clean URL so it doesn't re-trigger
    const clean = new URL(window.location.href);
    clean.searchParams.delete("share-target");
    clean.searchParams.delete("title");
    clean.searchParams.delete("text");
    clean.searchParams.delete("url");
    window.history.replaceState({}, "", clean.toString());
  }, [loc.search]);

  if (!shared) return null;

  const query = (shared.title || shared.text || shared.url).slice(0, 200);
  const close = () => setShared(null);

  const goService = () => { close(); nav(`/all-services?q=${encodeURIComponent(query)}`); };
  const goMart = () => { close(); nav(`/mart/home?q=${encodeURIComponent(query)}`); };
  const goDeal = () => { close(); nav(`/deal/post?title=${encodeURIComponent(query)}`); };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] flex items-end justify-center bg-black/55 backdrop-blur-sm md:items-center"
        onClick={close}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl md:rounded-3xl"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted md:hidden" />
          <div className="mb-3 flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-base font-bold text-foreground">
                {bn ? "শেয়ার করা কন্টেন্ট" : "Shared with Shondhaan"}
              </h3>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{query}</p>
            </div>
            <button onClick={close} aria-label="Close" className="-mr-1 -mt-1 rounded-full p-1.5 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {bn ? "এটি দিয়ে কী করতে চান?" : "What would you like to do?"}
          </p>
          <div className="grid gap-2">
            <button
              onClick={goService}
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
            >
              <Search className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{bn ? "সার্ভিস খুঁজুন" : "Search Services"}</div>
                <div className="text-[11px] text-muted-foreground">{bn ? "১৮৬+ সার্ভিসর মধ্যে অনুসন্ধান" : "Find from 186+ services"}</div>
              </div>
            </button>
            <button
              onClick={goMart}
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
            >
              <ShoppingBag className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{bn ? "মার্টে খুঁজুন" : "Search Shondhaan Mart"}</div>
                <div className="text-[11px] text-muted-foreground">{bn ? "পণ্য ও অফার দেখুন" : "Find products & offers"}</div>
              </div>
            </button>
            <button
              onClick={goDeal}
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
            >
              <Package className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{bn ? "ডিলে বিজ্ঞাপন দিন" : "Post on Shondhaan Deal"}</div>
                <div className="text-[11px] text-muted-foreground">{bn ? "এই কন্টেন্ট দিয়ে নতুন বিজ্ঞাপন" : "Create a new listing"}</div>
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShareTargetReceiver;