import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box, Camera, X, RotateCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Props {
  productName: string;
  imageUrl?: string | null;
  className?: string;
}

/**
 * Lightweight "AR-style" product preview. Opens the rear camera, overlays
 * the product image at a draggable/scalable position so the user can see
 * how it'd look in their room. Pure WebRTC + CSS — no model files needed.
 */
const ARProductPreview = ({ productName, imageUrl, className }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        toast.error(bn ? "ক্যামেরা অ্যাক্সেস ব্যর্থ" : "Camera access failed");
        setOpen(false);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, bn]);

  if (!imageUrl) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20 ${className ?? ""}`}
      >
        <Box className="h-3.5 w-3.5" />
        {bn ? "AR প্রিভিউ" : "AR preview"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black"
          >
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />

            <motion.img
              src={imageUrl}
              alt={productName}
              drag
              dragMomentum={false}
              style={{ scale, rotate: rot }}
              className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 cursor-grab object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:cursor-grabbing"
              draggable={false}
            />

            <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4 text-white">
              <div className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                {productName}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-black/50 p-2 backdrop-blur-md"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/50 px-4 py-2.5 text-white backdrop-blur-md">
              <button
                onClick={() => setScale((s) => Math.max(0.4, s - 0.15))}
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold"
              >
                −
              </button>
              <Camera className="h-4 w-4 opacity-70" />
              <button
                onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold"
              >
                +
              </button>
              <button
                onClick={() => setRot((r) => r + 30)}
                className="rounded-full bg-white/15 p-1.5"
                aria-label="Rotate"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="absolute bottom-24 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/40 px-3 py-1 text-[10px] text-white/80 backdrop-blur-md">
              {bn ? "ছবি টেনে নিয়ে যান, প্লাস/মাইনাস দিয়ে রিসাইজ করুন" : "Drag image, use ± to resize"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ARProductPreview;