import { motion, AnimatePresence } from "framer-motion";
import { getServiceImage } from "@/data/serviceImages";
import { X, GitCompareArrows } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompare } from "@/contexts/CompareContext";
import { useLanguage } from "@/contexts/LanguageContext";

const CompareBar = () => {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  if (compareList.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-2xl"
      >
        <div className="mx-auto max-w-5xl lg:max-w-7xl px-4 lg:px-8 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {compareList.map((s) => (
              <div key={s.slug} className="relative shrink-0 flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
                <span className="yess-wm yess-wm-sm inline-block h-8 w-8 overflow-hidden rounded-md">
                  <img src={getServiceImage(s.slug, s.image_url)} alt={s.title} className="h-8 w-8 object-cover" />
                </span>
                <span className="text-xs font-medium text-foreground max-w-[80px] truncate">
                  {bn ? s.title : s.title_en || s.title}
                </span>
                <button
                  onClick={() => removeFromCompare(s.slug)}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            {compareList.length < 3 && (
              <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg border-2 border-dashed border-border">
                <span className="text-xs text-muted-foreground">+</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={clearCompare} className="text-xs text-muted-foreground hover:text-destructive px-2 py-1">
              {bn ? "মুছুন" : "Clear"}
            </button>
            <button
              onClick={() => navigate("/compare")}
              disabled={compareList.length < 2}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <GitCompareArrows className="h-3.5 w-3.5" />
              {bn ? "তুলনা করুন" : "Compare"} ({compareList.length})
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompareBar;
