import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Navigation } from "lucide-react";

interface LocationPermissionModalProps {
  open: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

const LocationPermissionModal = ({ open, onAllow, onSkip }: LocationPermissionModalProps) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-sm rounded-2xl bg-background shadow-2xl border border-border overflow-hidden"
          >
            {/* Close */}
            <button
              onClick={onSkip}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground z-10"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon area */}
            <div className="flex flex-col items-center pt-8 pb-4 px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>

              <h3 className="text-lg font-bold text-foreground text-center font-heading">
                আপনার লোকেশন জানতে চাই
              </h3>
              <p className="mt-2 text-sm text-muted-foreground text-center leading-relaxed">
                আপনার এলাকায় কোন সার্ভিসগুলো পাওয়া যায় তা দেখাতে এবং দ্রুত সার্ভিস দিতে আমাদের আপনার বর্তমান অবস্থান জানা দরকার।
              </p>
            </div>

            {/* Features */}
            <div className="px-6 pb-4 space-y-2">
              {[
                "আপনার এলাকার সার্ভিস দেখুন",
                "কাছের সার্ভিসদাতা খুঁজে পান",
                "সঠিক মূল্য ও সময় জানুন",
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 px-6 pb-6 pt-2">
              <button
                onClick={onAllow}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                <Navigation className="h-4 w-4" />
                লোকেশন অনুমতি দিন
              </button>
              <button
                onClick={onSkip}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                পরে করব
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationPermissionModal;
