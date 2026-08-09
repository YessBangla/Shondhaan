import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Check, RotateCw, Image as ImageIcon, Crop } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  /** Optional title shown in the header, e.g. "Scan NID Front". */
  title?: string;
}

/**
 * In-app document scanner. Opens the rear camera, overlays an A-series
 * frame guide, and produces an auto-cropped, contrast-boosted JPEG ready
 * for upload (NID, prescription, trade license, etc.). Falls back to
 * gallery upload on devices that block camera access.
 */
const DocumentScanner = ({ open, onClose, onCapture, title }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stop();
      setPreview(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError(bn ? "ক্যামেরা অ্যাক্সেস করা যায়নি" : "Camera unavailable");
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, stop, bn]);

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    // Match a 4:3 portrait crop (typical doc aspect)
    const targetW = 1240;
    const targetH = 1748; // ~A4
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Center-crop the video into the document frame
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const targetRatio = targetW / targetH;
    const videoRatio = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, targetW, targetH);

    // Light contrast/brightness boost for legibility
    try {
      const img = ctx.getImageData(0, 0, targetW, targetH);
      const d = img.data;
      const c = 1.18; // contrast
      const b = 8;   // brightness
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, (d[i] - 128) * c + 128 + b);
        d[i + 1] = Math.min(255, (d[i + 1] - 128) * c + 128 + b);
        d[i + 2] = Math.min(255, (d[i + 2] - 128) * c + 128 + b);
      }
      ctx.putImageData(img, 0, 0);
    } catch {}

    haptic("medium");
    setPreview(canvas.toDataURL("image/jpeg", 0.88));
  };

  const accept = () => {
    if (!preview) return;
    haptic("success");
    onCapture(preview);
    onClose();
    toast.success(bn ? "ডকুমেন্ট সংরক্ষিত হয়েছে" : "Document saved");
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col bg-black"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-black/70 px-4 py-3 text-white backdrop-blur">
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
          <h2 className="flex-1 truncate text-center text-sm font-semibold">
            {title || (bn ? "ডকুমেন্ট স্ক্যান" : "Scan Document")}
          </h2>
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Upload from gallery"
            className="rounded-full p-2 hover:bg-white/10"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
        </div>

        {/* Stage */}
        <div className="relative flex-1 overflow-hidden">
          {preview ? (
            <img src={preview} alt="preview" className="h-full w-full object-contain" />
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
              <Camera className="h-12 w-12 opacity-50" />
              <p className="text-sm">{error}</p>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <ImageIcon className="mr-2 h-4 w-4" />
                {bn ? "গ্যালারি থেকে নির্বাচন" : "Choose from gallery"}
              </Button>
            </div>
          ) : (
            <>
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              {/* Frame overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-[70%] w-[80%] max-w-md">
                  <div className="absolute -inset-px rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
                  {/* corner markers */}
                  {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((c) => (
                    <span
                      key={c}
                      className={`absolute h-6 w-6 border-primary ${
                        c === "top-left" ? "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-2xl" :
                        c === "top-right" ? "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-2xl" :
                        c === "bottom-left" ? "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl" :
                        "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl"
                      }`}
                    />
                  ))}
                  <div className="absolute -bottom-9 left-0 right-0 text-center text-xs font-medium text-white/80">
                    <Crop className="mr-1 inline h-3 w-3" />
                    {bn ? "ফ্রেমের ভেতরে ডকুমেন্ট রাখুন" : "Align document inside the frame"}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-around bg-black/80 px-6 py-5 text-white backdrop-blur">
          {preview ? (
            <>
              <button
                onClick={() => setPreview(null)}
                className="flex flex-col items-center gap-1 text-xs"
              >
                <RotateCw className="h-6 w-6" />
                {bn ? "আবার তুলুন" : "Retake"}
              </button>
              <button
                onClick={accept}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-primary/30"
              >
                <Check className="h-8 w-8" />
              </button>
              <div className="w-12" />
            </>
          ) : (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-1 text-xs opacity-80"
              >
                <ImageIcon className="h-6 w-6" />
                {bn ? "গ্যালারি" : "Gallery"}
              </button>
              <button
                onClick={capture}
                disabled={!!error}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg ring-4 ring-white/30 disabled:opacity-40"
                aria-label="Capture"
              >
                <div className="h-12 w-12 rounded-full border-2 border-black" />
              </button>
              <div className="w-12" />
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentScanner;