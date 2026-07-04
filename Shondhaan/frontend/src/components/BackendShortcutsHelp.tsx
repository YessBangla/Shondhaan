import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Shortcut {
  keys: string;
  label: string;
}

interface BackendShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

/**
 * Floating help overlay that lists backend keyboard shortcuts.
 * Triggered by Shift+? inside admin/role panels.
 */
const BackendShortcutsHelp = ({ open, onClose, shortcuts }: BackendShortcutsHelpProps) => {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-background/60 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ y: 24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Keyboard className="h-4 w-4 text-primary" />
                {bn ? "ব্যাকএন্ড কীবোর্ড শর্টকাট" : "Backend keyboard shortcuts"}
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {shortcuts.map((s) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
                >
                  <span className="text-foreground">{s.label}</span>
                  <kbd className="rounded-md bg-card px-2 py-0.5 font-mono text-[10px] font-bold text-primary shadow-sm border border-border/60">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[10px] text-muted-foreground">
              {bn
                ? "Shift + ? চাপলে যেকোনো সময় খুলবে · Esc বন্ধ করতে"
                : "Press Shift + ? anytime to open · Esc to close"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BackendShortcutsHelp;