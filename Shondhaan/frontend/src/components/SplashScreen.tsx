import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import workersImg from "@/assets/onboarding-workers.png";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [visible, setVisible] = useState(true);
  const { settings } = useSiteSettings();

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 500);
    }, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top,hsl(152_65%_42%)_0%,hsl(152_70%_30%)_45%,hsl(152_75%_18%)_100%)] px-6 pb-10 pt-20 text-white"
        >
          {/* Decorative blurred orbs — premium accent glow */}
          <div className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full bg-[hsl(160_75%_50%/0.22)] blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-[hsl(140_70%_55%/0.18)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[120%] -translate-x-1/2 rounded-full bg-[hsl(152_70%_45%/0.14)] blur-3xl" />

          {/* Logo + tagline */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative z-10 flex flex-col items-center gap-2"
          >
            {settings.logo_url ? (
              <div className="rounded-3xl bg-white p-4 shadow-2xl ring-4 ring-white/30">
                <img
                  src={settings.logo_url}
                  alt="Yess"
                  className="h-16 w-auto object-contain"
                />
              </div>
            ) : (
              <h1 className="font-heading text-6xl font-black tracking-tight drop-shadow-lg">
                YESS
              </h1>
            )}
            <p className="mt-3 text-sm font-medium tracking-wide text-white/90">
              Your Easy Service Solution
            </p>
            <p className="mt-6 text-center text-base font-semibold leading-snug text-white/95">
              আপনার প্রয়োজনীয়<br />সব সার্ভিস এখন<br />এক জায়গায়
            </p>
          </motion.div>

          {/* Workers illustration */}
          <motion.img
            src={workersImg}
            alt=""
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 mt-6 max-h-[42vh] w-auto object-contain drop-shadow-2xl"
            loading="eager"
          />

          {/* CTA button */}
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            onClick={() => { setVisible(false); setTimeout(onFinish, 300); }}
            className="relative z-10 flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-amber-400 px-8 py-3.5 text-base font-bold text-emerald-950 shadow-xl active:scale-95 transition-transform"
          >
            শুরু করুন
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950/15">→</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
