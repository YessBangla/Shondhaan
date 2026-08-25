import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface SharePopupPortalProps {
  url: string;
  title: string;
  anchorRect: DOMRect;
  onClose: () => void;
}

const SharePopupPortal = ({ url, title, anchorRect, onClose }: SharePopupPortalProps) => {
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const bn = language === "bn";
  const popupRef = useRef<HTMLDivElement>(null);
  const text = bn ? `${title} - সার্ভিস দেখুন` : `Check out ${title}`;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target;
      if (popupRef.current && target instanceof Node && !popupRef.current.contains(target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(bn ? "লিংক কপি হয়েছে!" : "Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const socials = [
    { name: "Facebook", color: "bg-[#1877F2]", icon: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { name: "WhatsApp", color: "bg-[#25D366]", icon: "w", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    { name: "X", color: "bg-foreground", icon: "𝕏", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  ];
  const top = anchorRect.bottom + window.scrollY + 8;
  const left = Math.max(8, Math.min(anchorRect.left + window.scrollX - 100, window.innerWidth - 240));
  return createPortal(
    <motion.div
      ref={popupRef}
      initial={{ opacity: 0, scale: 0.9, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -5 }}
      transition={{ duration: 0.2 }}
      className="fixed z-[9999] w-[230px] rounded-xl border border-border bg-popover p-3 shadow-xl"
      style={{ top, left, position: "absolute" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">{bn ? "শেয়ার করুন" : "Share"}</span>
        <button onClick={onClose} className="rounded-full p-0.5 hover:bg-secondary">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="flex gap-2 mb-3">
        {socials.map((s) => (
          <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer"
            className={`flex h-9 w-9 items-center justify-center rounded-full ${s.color} text-white text-sm font-bold transition-transform hover:scale-110`}
          >
            {s.icon}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1.5">
        <span className="flex-1 truncate text-[11px] text-muted-foreground">{url}</span>
        <button onClick={copyLink}
          className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-primary/90"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? (bn ? "কপি হয়েছে" : "Copied") : (bn ? "কপি" : "Copy")}
        </button>
      </div>
    </motion.div>,
    document.body
  );
};

/** Reusable share button + popup. Pass `url` and `title`. */
export const ShareButton = ({
  url,
  title,
  className = "",
  iconClassName = "h-3.5 w-3.5",
}: {
  url: string;
  title: string;
  className?: string;
  iconClassName?: string;
}) => {
  const [shareState, setShareState] = useState<DOMRect | null>(null);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Native share sheet on mobile when available — true app feel
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title, url });
        return;
      } catch {
        /* user cancelled — fall through to popup */
      }
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setShareState(shareState ? null : rect);
  };

  return (
    <>
      <button onClick={handleShare} className={className}>
        <Share2 className={iconClassName} />
      </button>
      <AnimatePresence>
        {shareState && (
          <SharePopupPortal
            url={url}
            title={title}
            anchorRect={shareState}
            onClose={() => setShareState(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default SharePopupPortal;
