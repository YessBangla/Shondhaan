import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Phone, X } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface Props { phone?: string; className?: string }

export default function SOSButton({ phone = "999", className }: Props) {
  const [open, setOpen] = useState(false);

  const call = () => {
    haptic("heavy");
    window.location.href = `tel:${phone}`;
  };

  return (
    <>
      <button
        onClick={() => { haptic("medium"); setOpen(true); }}
        aria-label="Emergency SOS"
        className={cn(
          // Mobile uses the unified MobileFabHub Emergency action — hide here to avoid stacking.
          "hidden md:flex fixed bottom-8 right-4 z-40 h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xl",
          "ring-4 ring-destructive/30",
          className
        )}
      >
        <motion.span
          className="absolute inset-0 rounded-full bg-destructive/40"
          animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <ShieldAlert className="relative h-6 w-6" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl"
            >
              <button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-full p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <ShieldAlert className="h-7 w-7 text-destructive" />
                </div>
                <h3 className="mt-3 text-lg font-bold">জরুরি সহায়তা</h3>
                <p className="mt-1 text-sm text-muted-foreground">আপনি কি জরুরি নম্বরে কল করতে চান?</p>
                <button
                  onClick={call}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 font-semibold text-destructive-foreground"
                >
                  <Phone className="h-5 w-5" /> {phone} এ কল করুন
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
