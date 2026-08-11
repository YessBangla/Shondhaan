import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand, ArrowLeft, ChevronsDown, Mic, Keyboard, Smartphone, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const KEY = "yess_gesture_tutorial_seen_v1";

/**
 * One-time gesture tutorial overlay shown to brand-new mobile users
 * after onboarding. Educates them about the hidden gestures we ship
 * (swipe-back, swipe-down dismiss, voice FAB, keyboard ?, shake-undo).
 */
const GestureTutorial = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(KEY);
      const onboarded = localStorage.getItem("yess_onboarded");
      if (!seen && onboarded && window.innerWidth < 768) {
        const t = window.setTimeout(() => setOpen(true), 1200);
        return () => window.clearTimeout(t);
      }
    } catch { /* silent */ }
  }, []);

  const tips = bn
    ? [
        { icon: ArrowLeft, title: "সোয়াইপ ব্যাক", desc: "যেকোনো পেজে স্ক্রিনের বাম প্রান্ত থেকে ডানে টানুন।" },
        { icon: ChevronsDown, title: "নিচে টেনে বন্ধ করুন", desc: "কোনো মোডাল/শীট খুললে নিচে টেনে দ্রুত বন্ধ করুন।" },
        { icon: Mic, title: "ভয়েসে বুক করুন", desc: "নিচের ডানে মাইক বাটন চেপে বলুন কোন সার্ভিস চান।" },
        { icon: Smartphone, title: "শেক করে আনডু", desc: "ভুল করেছেন? ফোনটি একটু ঝাঁকান — শেষ অ্যাকশন undo হবে।" },
        { icon: Keyboard, title: "কীবোর্ড শর্টকাট", desc: "ডেস্কটপে Shift + ? চেপে সব শর্টকাট দেখুন।" },
      ]
    : [
        { icon: ArrowLeft, title: "Swipe back", desc: "Swipe right from the left edge to go back on any page." },
        { icon: ChevronsDown, title: "Pull down to close", desc: "Drag any modal sheet downward to dismiss instantly." },
        { icon: Mic, title: "Voice booking", desc: "Tap the floating mic button and say which service you need." },
        { icon: Smartphone, title: "Shake to undo", desc: "Made a mistake? Shake your phone to undo the last action." },
        { icon: Keyboard, title: "Keyboard shortcuts", desc: "On desktop press Shift + ? to see every shortcut." },
      ];

  const close = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setOpen(false);
  };

  const next = () => {
    if (step >= tips.length - 1) close();
    else setStep((s) => s + 1);
  };

  const Icon = tips[step]?.icon ?? Hand;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        >
          <motion.div
            key={step}
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="relative w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 text-center shadow-2xl"
          >
            <button
              onClick={close}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-white shadow-lg shadow-primary/30">
              <Icon className="h-8 w-8" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-foreground">{tips[step].title}</h3>
            <p className="mb-5 text-sm text-muted-foreground">{tips[step].desc}</p>

            <div className="mb-4 flex justify-center gap-1.5">
              {tips.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={close}
                className="flex-1 rounded-xl border border-border/60 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
              >
                {bn ? "এড়িয়ে যান" : "Skip"}
              </button>
              <button
                onClick={next}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow"
              >
                {step >= tips.length - 1 ? (bn ? "শুরু করুন" : "Get started") : (bn ? "পরবর্তী" : "Next")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GestureTutorial;