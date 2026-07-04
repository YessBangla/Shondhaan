import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Clock, TrendingUp, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import LocationSelector from "@/components/LocationSelector";

interface DealSearchBoxProps {
  location?: string;
  className?: string;
}

const RECENT_KEY = "deal_recent_searches";
const getRecent = (): string[] => JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5);
const saveRecent = (q: string) => {
  const arr = getRecent().filter((s) => s !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...arr].slice(0, 8)));
};

const DealSearchBox = ({ location = "all", className }: DealSearchBoxProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; title: string; title_en: string | null; price: number; images: any }[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target;
      if (wrapperRef.current && target instanceof Node && !wrapperRef.current.contains(target)) setFocused(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("deal_listings")
        .select("id, title, title_en, price, images")
        .eq("status", "active")
        .or(`title.ilike.%${query.replace(/[%_]/g, '')}%,title_en.ilike.%${query.replace(/[%_]/g, '')}%,description.ilike.%${query.replace(/[%_]/g, '')}%`)
        .limit(6);
      setSuggestions(data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const doSearch = (q: string) => {
    if (!q.trim()) return;
    saveRecent(q.trim());
    setFocused(false);
    const params = new URLSearchParams();
    params.set("q", q.trim());
    if (location !== "all") params.set("div", location);
    navigate(`/deal/ads?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const recentSearches = getRecent();
  const showDropdown = focused && (query.length >= 2 ? suggestions.length > 0 || loading : recentSearches.length > 0);

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      <form onSubmit={handleSubmit}
        className="flex items-center overflow-hidden rounded-xl bg-card border border-border shadow-sm"
      >
        <LocationSelector />
        <div className="relative flex-1 flex items-center px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={bn ? "বিজ্ঞাপন খুঁজুন বাংলা বা English এ..." : "Search ads in Bangla or English..."}
            className="w-full bg-transparent py-3 pl-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setSuggestions([]); }} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button type="submit" className="m-1.5 flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-primary-foreground transition-colors hover:bg-primary/90">
          <Search className="h-4 w-4" />
        </button>
      </form>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full mb-2 left-0 right-0 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          >
            {query.length < 2 && recentSearches.length > 0 && (
              <div className="p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {bn ? "সাম্প্রতিক সার্চ" : "Recent"}
                </p>
                {recentSearches.map((s) => (
                  <button key={s} onClick={() => { setQuery(s); doSearch(s); }} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" /> {s}
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}

            {query.length >= 2 && !loading && suggestions.length > 0 && (
              <div className="p-2 max-h-72 overflow-y-auto">
                {suggestions.map((s) => {
                  const img = Array.isArray(s.images) ? s.images[0] : null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setFocused(false); navigate(`/deal/ad/${s.id}`); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0">
                        {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <p className="font-medium line-clamp-1">{bn ? s.title : (s.title_en || s.title)}</p>
                        {s.title_en && s.title_en !== s.title && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{bn ? s.title_en : s.title}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-primary shrink-0">৳{s.price.toLocaleString("bn-BD")}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => doSearch(query)}
                  className="w-full mt-1 px-3 py-2 text-sm text-primary font-medium rounded-lg hover:bg-primary/5 transition-colors text-center"
                >
                  {bn ? `"${query}" এর সব ফলাফল দেখুন` : `See all results for "${query}"`}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DealSearchBox;
