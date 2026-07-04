import { motion } from "framer-motion";
import { ShoppingBag, Phone, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { haptic } from "@/lib/haptics";

interface StickyBottomCTAProps {
  price: number;
  originalPrice?: number | null;
  packageName?: string;
  onAddToCart: () => void;
  onChat?: () => void;
  disabled?: boolean;
}

/**
 * Mobile-only sticky bottom action bar for service / product detail pages.
 * Stays above the MobileBottomNav (which sits at bottom-0).
 * Provides quick price visibility + Call, Chat, and primary Add-to-Cart actions.
 */
const StickyBottomCTA = ({
  price,
  originalPrice,
  packageName,
  onAddToCart,
  onChat,
  disabled,
}: StickyBottomCTAProps) => {
  const { language } = useLanguage();
  const { settings } = useSiteSettings();
  const bn = language === "bn";

  const formatPrice = (n: number) => {
    if (bn) {
      const map: Record<string, string> = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };
      return n.toLocaleString("bn-BD").split("").map((c) => map[c] ?? c).join("");
    }
    return n.toLocaleString("bn-BD");
  };

  const phoneRaw = settings.footer_phone || "+8801700000000";
  const bnDigitMap: Record<string, string> = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };
  const normalized = phoneRaw.split("").map((c) => bnDigitMap[c] ?? c).join("");
  const telHref = `tel:${normalized.replace(/\s|-/g, "")}`;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="fixed bottom-[78px] left-2 right-2 z-40 md:hidden rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-[0_-8px_28px_rgba(0,0,0,0.12)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)" }}
      role="region"
      aria-label={bn ? "দ্রুত বুকিং" : "Quick booking"}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Price block */}
        <div className="flex flex-col leading-tight min-w-0 flex-shrink">
          <span className="text-[11px] text-muted-foreground truncate">
            {packageName || (bn ? "মূল্য" : "Price")}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-[17px] font-bold text-primary whitespace-nowrap">
              ৳{formatPrice(price)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[11px] text-muted-foreground line-through whitespace-nowrap">
                ৳{formatPrice(originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Quick contact actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          <a
            href={telHref}
            onClick={() => haptic("light")}
            aria-label={bn ? "কল করুন" : "Call"}
            className="press flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <Phone className="h-[18px] w-[18px]" />
          </a>
          {onChat && (
            <button
              type="button"
              onClick={() => { haptic("light"); onChat(); }}
              aria-label={bn ? "চ্যাট" : "Chat"}
              className="press flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground"
            >
              <MessageCircle className="h-[18px] w-[18px]" />
            </button>
          )}

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => { haptic("medium"); onAddToCart(); }}
            disabled={disabled}
            className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-[13px] font-bold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            {bn ? "বুক করুন" : "Book Now"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default StickyBottomCTA;
