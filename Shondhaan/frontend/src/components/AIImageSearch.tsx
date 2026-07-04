import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * AI image search modal — user uploads/captures a photo, app suggests
 * matching service category and routes them. Currently uses keyword
 * heuristics on filename + mock visual analysis (ready for AI gateway upgrade).
 */
export default function AIImageSearch({ open, onClose }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const bn = (typeof window !== "undefined" && (localStorage.getItem("yess_lang") || "bn") === "bn");

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    analyze(file);
  };

  const analyze = (file: File) => {
    setAnalyzing(true);
    haptic("medium");
    // Heuristic analysis — match filename keywords to service categories.
    // Production: send to ai-tools edge function with image analysis.
    setTimeout(() => {
      const name = file.name.toLowerCase();
      const matchers: { kw: string[]; route: string; label: string; labelBn: string }[] = [
        { kw: ["ac", "air", "cool"], route: "/all-services?q=AC", label: "AC Servicing", labelBn: "এসি সার্ভিসিং" },
        { kw: ["clean", "broom", "mop"], route: "/all-services?q=cleaning", label: "Cleaning", labelBn: "পরিচ্ছন্নতা" },
        { kw: ["pipe", "tap", "leak", "plumb"], route: "/all-services?q=plumbing", label: "Plumbing", labelBn: "প্লাম্বিং" },
        { kw: ["wire", "switch", "elec", "bulb"], route: "/all-services?q=electric", label: "Electrical", labelBn: "ইলেকট্রিক" },
        { kw: ["paint", "wall"], route: "/all-services?q=paint", label: "Painting", labelBn: "পেইন্টিং" },
        { kw: ["car", "vehicle", "bike"], route: "/all-services?q=car", label: "Vehicle", labelBn: "যানবাহন" },
        { kw: ["pest", "insect", "rat"], route: "/all-services?q=pest", label: "Pest Control", labelBn: "পেস্ট কন্ট্রোল" },
      ];
      const hit = matchers.find((m) => m.kw.some((k) => name.includes(k)));
      setAnalyzing(false);
      haptic("success");
      if (hit) {
        toast.success(bn ? `মিলে গেছে: ${hit.labelBn}` : `Matched: ${hit.label}`);
        setTimeout(() => {
          onClose();
          navigate(hit.route);
        }, 600);
      } else {
        toast.info(bn ? "সেবা খুঁজছি..." : "Browsing all services...");
        setTimeout(() => {
          onClose();
          navigate("/all-services");
        }, 600);
      }
    }, 1400);
  };

  const reset = () => {
    setPreview(null);
    setAnalyzing(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between bg-gradient-to-br from-primary to-pink-500 p-4 text-primary-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <h3 className="text-sm font-bold">{bn ? "AI ছবি দিয়ে খুঁজুন" : "AI Image Search"}</h3>
              </div>
              <button onClick={close} aria-label="close" className="rounded-full bg-primary-foreground/20 p-1 hover:bg-primary-foreground/30">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {!preview && (
                <div className="space-y-3">
                  <p className="text-center text-xs text-muted-foreground">
                    {bn
                      ? "যেকোনো সমস্যার ছবি তুলুন বা আপলোড করুন — AI সঠিক সেবা সাজেস্ট করবে"
                      : "Snap or upload a photo — AI will suggest the right service"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-border p-4 text-foreground hover:border-primary hover:bg-primary/5"
                    >
                      <Camera className="h-6 w-6 text-primary" />
                      <span className="text-xs font-semibold">{bn ? "ক্যামেরা" : "Camera"}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (fileRef.current) {
                          fileRef.current.removeAttribute("capture");
                          fileRef.current.click();
                          fileRef.current.setAttribute("capture", "environment");
                        }
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-border p-4 text-foreground hover:border-primary hover:bg-primary/5"
                    >
                      <Upload className="h-6 w-6 text-primary" />
                      <span className="text-xs font-semibold">{bn ? "আপলোড" : "Upload"}</span>
                    </button>
                  </div>
                </div>
              )}

              {preview && (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-2xl">
                    <img src={preview} alt="search" className="h-40 w-full object-cover" />
                    {analyzing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                        <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                        <p className="text-xs font-semibold">
                          {bn ? "AI বিশ্লেষণ করছে..." : "AI is analyzing..."}
                        </p>
                      </div>
                    )}
                  </div>
                  {!analyzing && (
                    <button
                      onClick={reset}
                      className="w-full rounded-xl bg-muted py-2 text-xs font-semibold text-foreground hover:bg-accent"
                    >
                      {bn ? "অন্য ছবি" : "Try another"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
