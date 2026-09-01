import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Mic, Sparkles, Zap, Headphones } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";
import EmergencyServiceModal from "@/components/EmergencyServiceModal";

/**
 * Unified mobile-only Speed Dial that consolidates every floating action
 * (Chat, WhatsApp, Voice, Matchmaker, Emergency) into a single button.
 * Reduces overlap with banners, category headers, and the bottom nav.
 *
 * Each individual FAB component still mounts on desktop; on mobile we
 * dispatch window events to open their existing modals/sheets, keeping
 * their internal logic untouched.
 */
const MobileFabHub = () => {
  const { language } = useLanguage();
  const { pathname } = useLocation();
  const bn = language === "bn";
  const [open, setOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  // Hide on staff/admin/auth routes — same gate the underlying widgets use.
  const hidden =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/internal") ||
    pathname === "/login";

  // Close the dial on route change.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Dismiss with Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (hidden) return null;

  // Build WhatsApp link (same logic as WhatsAppFloatingButton).
  const phoneRaw = "+8801805464343";
  const bnDigitMap: Record<string, string> = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };
  const normalized = phoneRaw.split("").map((c) => bnDigitMap[c] ?? c).join("");
  const digits = normalized.replace(/\D/g, "");
  const waNumber = digits.startsWith("880") ? digits : digits.startsWith("0") ? `880${digits.slice(1)}` : digits;
  const waMsg = bn
    ? "হ্যালো, আমি Shondhaan থেকে যোগাযোগ করছি। আমি জানতে চাই —"
    : "Hello, I'm contacting from Shondhaan. I'd like to know —";
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`;

  type Action = {
    key: string;
    label: string;
    icon: React.ReactNode;
    bg: string;
    onClick: () => void;
  };

  const fire = (eventName: string) => () => {
    window.dispatchEvent(new CustomEvent(eventName));
  };

  const actions: Action[] = [
    {
      key: "chat",
      label: bn ? "চ্যাট" : "Chat",
      icon: <MessageCircle className="h-[20px] w-[20px]" strokeWidth={2.2} />,
      bg: "bg-gradient-to-br from-primary to-primary/80",
      onClick: fire("yess:open-chat"),
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: (
        <svg viewBox="0 0 32 32" className="h-[20px] w-[20px]" fill="currentColor" aria-hidden="true">
          <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.13-.63.085-.98-.058-.502-1.347-1.143-1.79-1.41zm-2.42 7.04h-.026c-1.706 0-3.382-.46-4.84-1.346l-.342-.207-3.59.943.957-3.482-.215-.345a9.075 9.075 0 0 1-1.39-4.84c0-5.018 4.087-9.105 9.106-9.105a9.082 9.082 0 0 1 9.097 9.106c0 5.018-4.087 9.105-9.105 9.105zm7.747-16.852A10.929 10.929 0 0 0 16.687 4.16C10.626 4.16 5.7 9.083 5.7 15.144c0 1.945.515 3.84 1.487 5.512L5.6 26.04l5.524-1.45a10.949 10.949 0 0 0 5.51 1.47h.005c6.061 0 10.99-4.929 10.99-10.99 0-2.94-1.144-5.7-3.225-7.78z" />
        </svg>
      ),
      bg: "bg-[#25D366]",
      onClick: () => { window.open(waHref, "_blank", "noopener,noreferrer"); },
    },
    {
      key: "voice",
      label: bn ? "ভয়েস" : "Voice",
      icon: <Mic className="h-[20px] w-[20px]" strokeWidth={2.2} />,
      bg: "bg-gradient-to-br from-violet-500 to-indigo-600",
      onClick: fire("yess:open-voice"),
    },
    {
      key: "matchmaker",
      label: bn ? "সঠিক সার্ভিস" : "Match",
      icon: <Sparkles className="h-[20px] w-[20px]" strokeWidth={2.2} />,
      bg: "bg-gradient-to-br from-fuchsia-500 to-pink-500",
      onClick: fire("yess:open-matchmaker"),
    },
    {
      key: "emergency",
      label: bn ? "জরুরি" : "Emergency",
      icon: <Zap className="h-[20px] w-[20px]" strokeWidth={2.2} />,
      bg: "bg-gradient-to-br from-rose-500 to-red-600",
      onClick: () => setEmergencyOpen(true),
    },
  ];

  return (
    <>
      {/* Full-screen scrim while open */}
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-label={bn ? "বন্ধ করুন" : "Close menu"}
            className="fixed inset-0 z-[54] bg-black/30 backdrop-blur-[3px] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Action column */}
      <div
        className="fixed right-3 z-[56] flex flex-col-reverse items-end gap-3 md:hidden pointer-events-none"
        style={{ bottom: getMobileFloatingBottom(72) }}>
        <AnimatePresence>
          {open &&
            actions.map((a, i) => (
              <motion.button
                key={a.key}
                type="button"
                initial={{ opacity: 0, x: 24, scale: 0.7 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  transition: { delay: i * 0.045, type: "spring", stiffness: 320, damping: 22 },
                }}
                exit={{
                  opacity: 0,
                  x: 24,
                  scale: 0.7,
                  transition: { delay: (actions.length - 1 - i) * 0.025, duration: 0.15 },
                }}
                onClick={() => {
                  haptic("light");
                  a.onClick();
                  setOpen(false);
                }}
                aria-label={a.label}
                className="press pointer-events-auto flex items-center gap-2.5"
                style={{ touchAction: "manipulation" }}
              >
                <span className="rounded-full bg-background/95 px-3 py-1.5 text-[12px] font-semibold text-foreground shadow-lg ring-1 ring-border/60 backdrop-blur-md">
                  {a.label}
                </span>
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_8px_22px_rgba(0,0,0,0.22)] ring-1 ring-white/30 ${a.bg}`}
                >
                  {a.icon}
                </span>
              </motion.button>
            ))}
        </AnimatePresence>
      </div>

      {/* Trigger FAB */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => { haptic("medium"); setOpen((v) => !v); }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={bn ? "দ্রুত অ্যাকশন" : "Quick actions"}
        className="press fixed right-3 z-[57] flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-emerald-600 text-white shadow-[0_10px_28px_hsl(var(--primary)/0.45)] ring-1 ring-white/25 md:hidden"
        style={{ bottom: getMobileFloatingBottom(8), touchAction: "manipulation" }}
      >
        {/* Idle pulse ring */}
        {!open && (
          <span className="pointer-events-none absolute inset-0 rounded-full bg-primary/40 opacity-60 animate-ping" />
        )}
        <motion.span
          key={open ? "x" : "menu"}
          initial={{ rotate: open ? -45 : 45, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="relative"
        >
          {open ? (
  <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.4} />
) : (
  <Headphones className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
)}
        </motion.span>
      </motion.button>

      <EmergencyServiceModal open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </>
  );
};

export default MobileFabHub;