import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, X, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Native-style QR scanner sheet. Uses the platform BarcodeDetector API
 * where available (Android Chrome, modern WebView). On unsupported
 * browsers (iOS Safari) it gracefully degrades to a manual token entry.
 * Recognised payloads:
 *   - URLs starting with our origin → in-app navigate
 *   - Plain tokens / any other text → routes to /track/<token>
 */
const QRScannerSheet = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    const hasDetector = typeof window !== "undefined" && "BarcodeDetector" in window;
    setSupported(hasDetector);
    if (!hasDetector) return;

    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const Detector = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (s: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
        const detector = new Detector({ formats: ["qr_code"] });
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              haptic("success");
              handlePayload(codes[0].rawValue);
              return;
            }
          } catch { /* per-frame errors are harmless */ }
          rafRef.current = window.requestAnimationFrame(tick);
        };
        rafRef.current = window.requestAnimationFrame(tick);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera unavailable";
        setError(msg);
      }
    };
    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePayload = (raw: string) => {
    onClose();
    const trimmed = raw.trim();
    try {
      const url = new URL(trimmed);
      if (url.origin === window.location.origin) {
        navigate(url.pathname + url.search);
        return;
      }
      // External link — open in new tab
      window.open(url.toString(), "_blank", "noopener");
      toast.success(bn ? "QR কোড স্ক্যান হয়েছে" : "QR scanned");
      return;
    } catch { /* not a URL */ }
    navigate(`/track/${encodeURIComponent(trimmed)}`);
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const t = manual.trim();
    if (!t) return;
    handlePayload(t);
    setManual("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] flex flex-col bg-black md:hidden"
        >
          <div className="flex items-center justify-between p-4 text-white">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <QrCode className="h-4 w-4" /> {bn ? "QR স্ক্যানার" : "QR Scanner"}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/10" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            {supported && !error ? (
              <>
                <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-64 w-64 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                    <span className="absolute -top-px left-0 h-6 w-6 rounded-tl-2xl border-l-4 border-t-4 border-primary" />
                    <span className="absolute -top-px right-0 h-6 w-6 rounded-tr-2xl border-r-4 border-t-4 border-primary" />
                    <span className="absolute -bottom-px left-0 h-6 w-6 rounded-bl-2xl border-l-4 border-b-4 border-primary" />
                    <span className="absolute -bottom-px right-0 h-6 w-6 rounded-br-2xl border-r-4 border-b-4 border-primary" />
                    <motion.span
                      initial={{ y: 0 }} animate={{ y: 240 }}
                      transition={{ duration: 1.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                      className="absolute left-2 right-2 top-2 h-0.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                    />
                  </div>
                </div>
                <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/80">
                  {bn ? "QR কোডটি ফ্রেমের ভিতরে রাখুন" : "Align the QR code inside the frame"}
                </p>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
                <Camera className="h-10 w-10 opacity-80" />
                <p className="text-sm font-medium">
                  {error
                    ? (bn ? "ক্যামেরা অ্যাক্সেস পাওয়া যায়নি" : "Camera unavailable")
                    : (bn ? "এই ব্রাউজারে স্ক্যানার সাপোর্টেড নয়" : "Scanner not supported on this browser")}
                </p>
                <p className="text-xs opacity-70 max-w-xs">
                  {bn ? "QR কোডের টোকেন/লিংক হাতে লিখুন" : "Type the token or link from the QR code below"}
                </p>
                <form onSubmit={submitManual} className="w-full max-w-xs flex gap-2">
                  <input
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    placeholder={bn ? "টোকেন বা লিংক..." : "Token or link..."}
                    className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none ring-1 ring-white/20 focus:ring-primary"
                  />
                  <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                    {bn ? "যান" : "Go"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QRScannerSheet;