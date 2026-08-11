import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Plus, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedFilters, SavedFilter } from "@/hooks/useSavedFilters";
import { toast } from "sonner";

/**
 * Dropdown for saving / loading filter presets.
 * `currentState` is what gets stored when "save" is clicked.
 * `onApply` receives the saved state object on selection.
 */
function SavedFiltersMenu<T>({
  scope, currentState, onApply, hasActiveFilters, className,
}: {
  scope: string;
  currentState: T;
  onApply: (state: T) => void;
  hasActiveFilters?: boolean;
  className?: string;
}) {
  const { filters, save, remove } = useSavedFilters<T>(scope);
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    save(name, currentState);
    setName("");
    setNaming(false);
    toast.success(`"${name}" ফিল্টার সেভ হয়েছে`);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-border/60 bg-card text-[11.5px] font-semibold text-foreground hover:bg-secondary transition-colors",
          filters.length > 0 && "border-primary/40 text-primary"
        )}
      >
        <Bookmark className="h-3.5 w-3.5" />
        সেভড ফিল্টার
        {filters.length > 0 && (
          <span className="rounded-full bg-primary/15 text-primary px-1.5 text-[10px] font-bold">
            {filters.length}
          </span>
        )}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setNaming(false); }} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border/60 bg-card shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-2 border-b border-border/60 bg-secondary/30">
                {naming ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setNaming(false); }}
                      placeholder="ফিল্টারের নাম…"
                      className="flex-1 h-8 px-2 rounded-lg bg-card border border-border text-[12px] outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button onClick={handleSave} className="h-8 px-2.5 rounded-lg bg-primary text-white text-[11px] font-bold">সেভ</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setNaming(true)}
                    disabled={!hasActiveFilters}
                    className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-primary/10 text-primary text-[11.5px] font-bold hover:bg-primary/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {hasActiveFilters ? "বর্তমান ফিল্টার সেভ করুন" : "প্রথমে ফিল্টার সেট করুন"}
                  </button>
                )}
              </div>

              <div className="max-h-[260px] overflow-y-auto p-1.5">
                {filters.length === 0 ? (
                  <p className="text-center py-6 text-[11px] text-muted-foreground">
                    এখনো কোনো সেভড ফিল্টার নেই
                  </p>
                ) : (
                  filters.map((f: SavedFilter<T>) => (
                    <div key={f.id} className="group flex items-center gap-1 rounded-lg hover:bg-secondary/60 transition-colors">
                      <button
                        onClick={() => { onApply(f.state); setOpen(false); toast.success(`"${f.name}" প্রয়োগ হয়েছে`); }}
                        className="flex-1 text-left px-2 py-1.5 min-w-0"
                      >
                        <p className="text-[12px] font-semibold text-foreground truncate">{f.name}</p>
                        <p className="text-[9.5px] text-muted-foreground truncate">
                          {new Date(f.createdAt).toLocaleDateString("bn-BD")}
                        </p>
                      </button>
                      <button
                        onClick={() => { remove(f.id); toast.success("মুছে ফেলা হয়েছে"); }}
                        className="h-7 w-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        title="মুছুন"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SavedFiltersMenu;