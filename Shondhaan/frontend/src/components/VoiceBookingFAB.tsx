import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { allServices } from "@/data/services";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";

/**
 * Floating voice-booking FAB. Uses Web Speech API to capture user intent
 * (e.g. "Book AC service tomorrow") and routes to the most relevant
 * service-detail page. Falls back to all-services search if unsure.
 */
const VoiceBookingFAB = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<any>(null);

  const SR =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const start = () => {
    if (!SR) {
      toast.error(bn ? "এই ব্রাউজার ভয়েস সাপোর্ট করে না" : "Voice not supported on this browser");
      return;
    }
    const rec = new SR();
    rec.lang = bn ? "bn-BD" : "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setTranscript(text);
    };
    rec.onend = () => {
      setListening(false);
    };
    rec.onerror = () => {
      setListening(false);
      toast.error(bn ? "ভয়েস ক্যাপচার ব্যর্থ" : "Voice capture failed");
    };
    recRef.current = rec;
    setTranscript("");
    setListening(true);
    rec.start();
  };

  const stop = () => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  };

  const submit = () => {
    const q = transcript.trim().toLowerCase();
    if (!q) {
      toast.warning(bn ? "প্রথমে কিছু বলুন" : "Say something first");
      return;
    }
    // Multi-language voice navigation commands first
    const navMap: Array<{ keys: string[]; path: string; label: string }> = [
      { keys: ["মার্ট", "mart", "shop", "কেনা"], path: "/mart/home", label: bn ? "মার্ট" : "Mart" },
      { keys: ["ডিল", "deal", "বিক্রয়", "sell", "buy"], path: "/deal", label: bn ? "ডিল" : "Deal" },
      { keys: ["জব", "চাকরি", "job", "career"], path: "/jobs", label: bn ? "জবস" : "Jobs" },
      { keys: ["বুকিং", "booking", "অর্ডার", "order"], path: "/bookings", label: bn ? "বুকিং" : "Bookings" },
      { keys: ["প্রোফাইল", "profile", "একাউন্ট", "account"], path: "/profile", label: bn ? "প্রোফাইল" : "Profile" },
      { keys: ["হোম", "home", "প্রথম"], path: "/", label: bn ? "হোম" : "Home" },
      { keys: ["সব সার্ভিস", "all service", "services", "সার্ভিসসমূহ"], path: "/all-services", label: bn ? "সব সার্ভিস" : "All services" },
    ];
    for (const cmd of navMap) {
      if (cmd.keys.some((k) => q.includes(k))) {
        toast.success(bn ? `${cmd.label}-এ যাচ্ছি` : `Opening ${cmd.label}`);
        navigate(cmd.path);
        setOpen(false);
        setTranscript("");
        return;
      }
    }
    // Naive fuzzy match against service titles
    const match = allServices.find((s) => {
      const title = (s.title || "").toLowerCase();
      const en = ((s as any).title_en || "").toLowerCase();
      return title && (q.includes(title) || title.split(" ").some((w) => w.length > 3 && q.includes(w)))
        || (en && (q.includes(en) || en.split(" ").some((w) => w.length > 3 && q.includes(w))));
    });
    if (match) {
      toast.success(bn ? `"${match.title}" পেজে নিয়ে যাচ্ছি` : `Opening "${match.title}"`);
      navigate(`/service/${match.slug}`);
    } else {
      navigate(`/all-services?q=${encodeURIComponent(transcript)}`);
    }
    setOpen(false);
    setTranscript("");
  };

  // Cleanup on unmount
  useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

  // Allow external triggers (mobile FAB hub) to open voice booking.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("yess:open-voice", handler as EventListener);
    return () => window.removeEventListener("yess:open-voice", handler as EventListener);
  }, []);

  // Hide on staff/admin routes (after all hooks)
  if (typeof window !== "undefined") {
    const p = window.location.pathname;
    if (p.startsWith("/admin") || p.startsWith("/super-admin") || p === "/auth") return null;
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className="fixed right-3 md:right-4 z-40 hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white shadow-lg shadow-primary/30 md:!bottom-[228px]"
        style={{ bottom: getMobileFloatingBottom(236) }}
        aria-label={bn ? "ভয়েসে বুক করুন" : "Book by voice"}
      >
        <Mic className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center"
            onClick={() => { stop(); setOpen(false); }}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border border-border/60 bg-card p-6 shadow-2xl md:rounded-3xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  {bn ? "ভয়েসে সার্ভিস বুক করুন" : "Book a service by voice"}
                </h3>
                <button
                  onClick={() => { stop(); setOpen(false); }}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-4 py-4">
                <motion.button
                  onClick={listening ? stop : start}
                  animate={listening ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={listening ? { repeat: Infinity, duration: 1.2 } : {}}
                  className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-xl ${
                    listening ? "bg-destructive shadow-destructive/40" : "bg-primary shadow-primary/40"
                  }`}
                >
                  {listening ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-8 w-8" />}
                </motion.button>
                <p className="text-center text-xs text-muted-foreground">
                  {listening
                    ? bn ? "শুনছি… বলুন কোন সার্ভিস চান" : "Listening… say the service you want"
                    : bn ? "মাইক চেপে বলুন (যেমন: এসি সার্ভিস)" : "Tap mic and say a service (e.g. AC service)"}
                </p>

                {transcript && (
                  <div className="w-full rounded-xl border border-border/60 bg-muted/30 p-3 text-sm italic text-foreground">
                    "{transcript}"
                  </div>
                )}
              </div>

              <button
                onClick={submit}
                disabled={!transcript || listening}
                className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md transition disabled:opacity-50"
              >
                {bn ? "সার্ভিস খুঁজুন" : "Find service"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceBookingFAB;