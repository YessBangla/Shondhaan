import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";

interface Props { src: string; alt?: string; className?: string; }

/**
 * Tap-to-open lightbox with pinch + double-tap zoom and pan.
 * Touch & wheel friendly, no extra deps.
 */
const PinchZoomImage = ({ src, alt, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const lastTap = useRef(0);
  const pinchStart = useRef<{ d: number; s: number } | null>(null);

  const dist = (a: React.Touch, b: React.Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStart.current = { d: dist(e.touches[0], e.touches[1]), s: scale };
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < 280) {
        setScale((s) => (s > 1.2 ? 1 : 2.2));
      }
      lastTap.current = now;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const d = dist(e.touches[0], e.touches[1]);
      const next = Math.max(1, Math.min(4, pinchStart.current.s * (d / pinchStart.current.d)));
      setScale(next);
    }
  };
  const onTouchEnd = () => { pinchStart.current = null; };

  return (
    <>
      <button
        type="button"
        onClick={() => { setScale(1); setOpen(true); }}
        className={className ?? "block w-full h-full"}
        aria-label="Zoom image"
      >
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/95"
            onClick={() => setOpen(false)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onWheel={(e) => setScale((s) => Math.max(1, Math.min(4, s - e.deltaY * 0.002)))}
          >
            <motion.img
              src={src}
              alt={alt}
              drag={scale > 1}
              dragMomentum={false}
              animate={{ scale }}
              transition={{ type: "spring", stiffness: 250, damping: 30 }}
              className="max-h-[90vh] max-w-[95vw] select-none object-contain"
              draggable={false}
              onClick={(e) => e.stopPropagation()}
            />

            <div className="absolute right-4 top-4 flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className="rounded-full bg-white/15 p-2 text-white backdrop-blur-md hover:bg-white/25"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-white backdrop-blur-md">
              <button onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(1, s - 0.4)); }} className="rounded-full p-1 hover:bg-white/15">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[3ch] text-center text-xs font-bold">{scale.toFixed(1)}×</span>
              <button onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(4, s + 0.4)); }} className="rounded-full p-1 hover:bg-white/15">
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PinchZoomImage;