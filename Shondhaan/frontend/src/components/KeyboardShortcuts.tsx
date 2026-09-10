import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

/**
 * Global keyboard shortcuts (power-user gestures).
 * Shift+? opens help. g+h home, g+m mart, g+d deal, g+j jobs, g+b bookings,
 * g+p profile, / focuses search, esc closes overlays.
 */
const KeyboardShortcuts = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [help, setHelp] = useState(false);

  useEffect(() => {
    let lastG = 0;
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || (t as HTMLElement).isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        haptic("light");
        setHelp((h) => !h);
        return;
      }
      if (e.key === "Escape") { setHelp(false); return; }
      if (e.key === "/") {
        const search = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="খুঁজ"], input[placeholder*="Search"]');
        if (search) { e.preventDefault(); search.focus(); haptic("light"); }
        return;
      }

      // "g" then nav key
      if (e.key === "g") { lastG = Date.now(); return; }
      if (Date.now() - lastG < 900) {
        const map: Record<string, string> = {
          h: "/", m: "/mart/home", d: "/deal", j: "/jobs",
          b: "/bookings", p: "/profile", a: "/all-services", c: "/checkout",
        };
        const path = map[e.key];
        if (path) {
          e.preventDefault();
          haptic("medium");
          navigate(path);
          toast.success(bn ? `যাচ্ছি ${path}` : `Navigating to ${path}`, { duration: 800 });
          lastG = 0;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, bn]);

  return (
    <AnimatePresence>
      {help && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setHelp(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-bold text-foreground">
                <Keyboard className="h-4 w-4 text-primary" />
                {bn ? "কীবোর্ড শর্টকাট" : "Keyboard shortcuts"}
              </div>
              <button onClick={() => setHelp(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["g h", bn ? "হোম" : "Home"],
                ["g m", bn ? "মার্ট" : "Mart"],
                ["g d", bn ? "ডিল" : "Deal"],
                ["g j", bn ? "চাকরি" : "Jobs"],
                ["g b", bn ? "বুকিং" : "Bookings"],
                ["g p", bn ? "প্রোফাইল" : "Profile"],
                ["g a", bn ? "সব সার্ভিস" : "All services"],
                ["g c", bn ? "চেকআউট" : "Checkout"],
                ["/", bn ? "সার্চ ফোকাস" : "Focus search"],
                ["?", bn ? "এই হেল্প" : "This help"],
                ["esc", bn ? "বন্ধ করুন" : "Close"],
              ].map(([k, label]) => (
                <div key={k} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5">
                  <span className="text-foreground">{label}</span>
                  <kbd className="rounded bg-card px-2 py-0.5 font-mono text-[10px] font-bold text-primary shadow-sm">{k}</kbd>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[10px] text-muted-foreground">
              {bn ? "Shift + ? চাপলে যেকোনো সময় খুলবে" : "Press Shift + ? anytime to open"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KeyboardShortcuts;