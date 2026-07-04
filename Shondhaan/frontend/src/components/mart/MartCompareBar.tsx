import { useNavigate } from "react-router-dom";
import { X, GitCompareArrows, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMartCompare } from "@/contexts/MartCompareContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AnimatePresence, motion } from "framer-motion";

const MartCompareBar = () => {
  const navigate = useNavigate();
  const { compareList, removeFromCompare, clearCompare } = useMartCompare();
  const { language } = useLanguage();
  const bn = language === "bn";

  if (compareList.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 max-w-lg w-[95%]"
      >
        <GitCompareArrows className="h-5 w-5 text-primary shrink-0" />

        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {compareList.map((p) => (
            <div key={p.id} className="relative shrink-0 h-12 w-12 rounded-lg bg-muted overflow-hidden border border-border/50">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              <button
                onClick={() => removeFromCompare(p.id)}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 2 - compareList.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="shrink-0 h-12 w-12 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground text-[10px]">
              +
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            disabled={compareList.length < 2}
            onClick={() => navigate("/mart/compare")}
            className="text-xs h-8 px-3"
          >
            {bn ? "তুলনা করুন" : "Compare"} ({compareList.length})
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={clearCompare}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MartCompareBar;
