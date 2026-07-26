import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { haptic } from "@/lib/haptics";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";

/**
 * WhatsApp floating contact button (mobile-only, international standard).
 * - Sits on the right-side FAB stack at bottom-[160px] to avoid overlap.
 * - Shows a small pulsing tooltip on first appearance.
 * - Uses the configured footer_phone (international format) as wa.me target.
 */
const WhatsAppFloatingButton = () => {
  const { language } = useLanguage();
  const { settings } = useSiteSettings();
  const bn = language === "bn";
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem("yess_wa_tip_dismissed") === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setShowTooltip(true), 2500);
    const t2 = setTimeout(() => {
      setShowTooltip(false);
      try {
        localStorage.setItem("yess_wa_tip_dismissed", "1");
      } catch {
        /* ignore */
      }
    }, 9000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [dismissed]);

  // Dedicated WhatsApp number (always used for the floating chat button).
  // Falls back to site settings phone only if this is ever cleared.
  const WHATSAPP_NUMBER = "+8801805464343";
  const phoneRaw = WHATSAPP_NUMBER || settings.footer_phone || "+8801700000000";
  const bnDigitMap: Record<string, string> = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };
  const normalized = phoneRaw.split("").map((c) => bnDigitMap[c] ?? c).join("");
  const digits = normalized.replace(/\D/g, "");
  const waNumber = digits.startsWith("880") ? digits : digits.startsWith("0") ? `880${digits.slice(1)}` : digits;

  const message = bn
    ? "হ্যালো, আমি Shondhaan থেকে যোগাযোগ করছি। আমি জানতে চাই —"
    : "Hello, I'm contacting from Shondhaan. I'd like to know —";
  const href = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

  const handleClick = () => {
    haptic("medium");
    setShowTooltip(false);
    setDismissed(true);
    try {
      localStorage.setItem("yess_wa_tip_dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed right-3 md:right-4 z-[51] hidden md:block md:!bottom-[160px]" style={{ bottom: getMobileFloatingBottom(128) }}>
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            className="absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg"
          >
            {bn ? "চ্যাট করুন" : "Chat with us"}
            <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={bn ? "WhatsApp এ চ্যাট করুন" : "Chat on WhatsApp"}
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.4 }}
        whileTap={{ scale: 0.9 }}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] shadow-[0_8px_20px_rgba(37,211,102,0.45)] ring-2 ring-white/40"
      >
        {/* Pulsing ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-50 animate-ping" />
        {/* WhatsApp logo */}
        <svg viewBox="0 0 32 32" className="relative h-6 w-6 text-white" fill="currentColor" aria-hidden="true">
          <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.13-.63.085-.98-.058-.502-1.347-1.143-1.79-1.41zm-2.42 7.04h-.026c-1.706 0-3.382-.46-4.84-1.346l-.342-.207-3.59.943.957-3.482-.215-.345a9.075 9.075 0 0 1-1.39-4.84c0-5.018 4.087-9.105 9.106-9.105a9.082 9.082 0 0 1 9.097 9.106c0 5.018-4.087 9.105-9.105 9.105zm7.747-16.852A10.929 10.929 0 0 0 16.687 4.16C10.626 4.16 5.7 9.083 5.7 15.144c0 1.945.515 3.84 1.487 5.512L5.6 26.04l5.524-1.45a10.949 10.949 0 0 0 5.51 1.47h.005c6.061 0 10.99-4.929 10.99-10.99 0-2.94-1.144-5.7-3.225-7.78z" />
        </svg>
      </motion.a>
    </div>
  );
};

export default WhatsAppFloatingButton;
