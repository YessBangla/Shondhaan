import { useRef, useState, useEffect, useCallback, forwardRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Star, ShoppingCart, Share2, X, Copy, Check, Eye, GitCompareArrows } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { useCompare } from "@/contexts/CompareContext";
import type { CmsService } from "@/hooks/useCmsData";
import { useLongPress } from "@/hooks/useLongPress";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface ServiceItem {
  title: string;
  image: string;
  slug?: string;
  rating?: number;
  price?: number;
  packageName?: string;
  description?: string;
  cmsService?: CmsService;
}

interface ServiceSectionProps {
  heading: string;
  services: ServiceItem[];
  viewAllLink?: string;
}

interface SharePopupProps {
  slug: string;
  title: string;
  anchorRect: DOMRect;
  onClose: () => void;
}

interface DescriptionTooltipProps {
  description: string;
  anchorRect: DOMRect;
}

/** Tooltip that shows the service description on hover. */
const DescriptionTooltip = ({ description, anchorRect }: DescriptionTooltipProps) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; arrowLeft: number }>({ top: 0, left: 0, arrowLeft: 0 });

  useEffect(() => {
    if (!tooltipRef.current) return;
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;

    const cardCenterX = anchorRect.left + window.scrollX + anchorRect.width / 2;

    let top = anchorRect.top + window.scrollY + anchorRect.height / 2;
    let left = cardCenterX - tooltipWidth / 2;

    // Clamp horizontally within viewport
    const margin = 12;
    if (left < window.scrollX + margin) left = window.scrollX + margin;
    if (left + tooltipWidth > window.scrollX + window.innerWidth - margin) {
      left = window.scrollX + window.innerWidth - tooltipWidth - margin;
    }

    // If the tooltip goes off the bottom of the viewport, push it up just enough to fit
    if (top + tooltipHeight > window.scrollY + window.innerHeight - margin) {
      top = window.scrollY + window.innerHeight - tooltipHeight - margin;
    }

    // Calculate arrow position relative to the tooltip to point at the card center
    const arrowWidth = 8;
    let arrowLeft = cardCenterX - left - arrowWidth / 2;
    
    // Clamp arrow so it doesn't escape the tooltip bounds
    if (arrowLeft < 8) arrowLeft = 8;
    if (arrowLeft > tooltipWidth - arrowWidth - 8) arrowLeft = tooltipWidth - arrowWidth - 8;

    setPosition({ top, left, arrowLeft });
  }, [anchorRect]);

  return createPortal(
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none absolute z-[9998] w-[260px] max-w-[calc(100vw-16px)] rounded-lg border border-border bg-blue-300 px-3 py-2 text-xs leading-relaxed text-foreground shadow-xl"
      style={{ top: position.top, left: position.left }}
      role="tooltip"
    >
      {description}
      {/* Arrow pointing up */}
      <span
        className="absolute -top-1 h-2 w-2 rotate-45 border-t border-l border-border bg-blue-300"
        style={{ left: position.arrowLeft }}
      />
    </motion.div>,
    document.body
  );
};

/** Per-card wrapper so we can attach long-press handlers and hover tooltip per item. */
const ServiceCardWrapper = ({
  service,
  onOpen,
  onLongPress,
  children,
}: {
  service: ServiceItem;
  onOpen: (e: React.MouseEvent) => void;
  onLongPress: () => void;
  children: React.ReactNode;
}) => {
  const longPress = useLongPress<HTMLDivElement>(onLongPress, 480);
  const [hovered, setHovered] = useState(false);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = (e: React.MouseEvent<HTMLDivElement> | React.FocusEvent<HTMLDivElement>) => {
    if (!service.description) return;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setHoverRect(e.currentTarget.getBoundingClientRect());
    setHovered(true);
  };

  const hideTooltip = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHovered(false), 120);
  };

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <>
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={onOpen}
        {...longPress}
        tabIndex={0}
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-blue-900/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] shrink-0 w-[calc(50vw-16px)] sm:w-[calc(50vw-28px)] md:max-w-[260px] md:min-w-[170px]"
      >
        {children}
      </div>

      <AnimatePresence>
        {hovered && hoverRect && service.description && (
          <DescriptionTooltip description={service.description} anchorRect={hoverRect} />
        )}
      </AnimatePresence>
    </>
  );
};


const SharePopup = forwardRef<HTMLDivElement, SharePopupProps>(({ slug, title, anchorRect, onClose }, _ref) => {
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const bn = language === "bn";
  const url = `${window.location.origin}/service/${slug}`;
  const text = bn ? `${title} - সেবা দেখুন` : `Check out ${title}`;
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target;
      if (popupRef.current && target instanceof Node && !popupRef.current.contains(target)) {
        onClose();
      }
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

  // Position below the share button
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
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex h-9 w-9 items-center justify-center rounded-full ${s.color} text-white text-sm font-bold transition-transform hover:scale-110`}
          >
            {s.icon}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1.5">
        <span className="flex-1 truncate text-[11px] text-muted-foreground">{url}</span>
        <button
          onClick={copyLink}
          className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? (bn ? "কপি হয়েছে" : "Copied") : (bn ? "কপি" : "Copy")}
        </button>
      </div>
    </motion.div>,
    document.body
  );
});

const ServiceSection = forwardRef<HTMLElement, ServiceSectionProps>(({ heading, services, viewAllLink }, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const { addToCompare, removeFromCompare, isInCompare, compareList, setIsOpen: openCompareBar } = useCompare();
  const [shareState, setShareState] = useState<{ slug: string; title: string; rect: DOMRect } | null>(null);
  const [quickMenu, setQuickMenu] = useState<ServiceItem | null>(null);
  const bn = language === "bn";

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -280 : 280,
        behavior: "smooth",
      });
    }
  };

  const handleAddToCart = (e: React.MouseEvent, service: ServiceItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (service.slug) {
      addItem({
        serviceSlug: service.slug,
        serviceTitle: service.title,
        serviceImage: service.image,
        packageName: service.packageName || (bn ? "বেসিক" : "Basic"),
        packagePrice: service.price || 0,
      });
      toast.success(bn ? "কার্টে যোগ হয়েছে!" : "Added to cart!");
    }
  };

  const handleShare = (e: React.MouseEvent, service: ServiceItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!service.slug) return;
    
    if (shareState?.slug === service.slug) {
      setShareState(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setShareState({ slug: service.slug, title: service.title, rect });
    }
  };

  const handleCompare = (e: React.MouseEvent, service: ServiceItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!service.cmsService || !service.slug) return;
    if (isInCompare(service.slug)) {
      removeFromCompare(service.slug);
      haptic("light");
      toast.info(bn ? "তুলনা থেকে সরানো হয়েছে" : "Removed from compare");
    } else {
      if (compareList.length >= 3) {
        toast.warning(bn ? "সর্বোচ্চ ৩টি সেবা তুলনা করা যাবে" : "Max 3 services to compare");
        return;
      }
      addToCompare(service.cmsService);
      haptic("medium");
      toast.success(bn ? "তুলনায় যোগ হয়েছে" : "Added to compare", {
        action: compareList.length >= 1 ? {
          label: bn ? "তুলনা দেখুন" : "Compare",
          onClick: () => navigate("/compare"),
        } : undefined,
      });
    }
  };

  const closeShare = useCallback(() => setShareState(null), []);

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="py-4 md:py-4"
    >
      <div className="mb-5 flex items-center justify-between px-4 md:mb-6 md:px-0">
        <h2 className="font-heading text-xl font-bold text-foreground md:text-3xl">{heading}</h2>
        {viewAllLink && (
          <button
            onClick={() => navigate(viewAllLink)}
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {t("section.viewAll")}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative group/section">
        <button onClick={() => scroll("left")} className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-md border border-border h-9 w-9 text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover/section:opacity-100 md:flex">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => scroll("right")} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-md border border-border h-9 w-9 text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover/section:opacity-100 md:flex">
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Horizontal scroll on all screen sizes - 2 items visible on mobile, more on desktop */}
        <div 
          ref={scrollRef} 
          className="flex gap-3 px-4 pb-2 overflow-x-auto md:gap-5 md:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}
        >
          {services.map((service) => (
            <ServiceCardWrapper
              key={service.title}
              service={service}
              onOpen={(e) => {
                if ((e.target as HTMLElement).closest("button, a")) return;
                if (service.slug) navigate(`/service/${service.slug}`);
              }}
              onLongPress={() => setQuickMenu(service)}
            >
              <div className="overflow-hidden bg-gradient-to-br from-blue-800/60 via-blue-400/40 to-green-600/40 p-2 yess-wm">
                <img src={service.image} alt={service.title} className="aspect-[3/2] rounded-md w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" fetchPriority="low" />
              </div>
              <div className="p-3 bg-blue-300/40 md:p-4">
                <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary md:text-base line-clamp-1">
                  {service.title}
                </h3>
                <div className="mt-1.5 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {service.rating ? service.rating.toFixed(1) : "0.0"}
                  </span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-sm font-bold text-foreground md:text-base">
                    {service.price && service.price > 0 ? (
                      <>
                        ৳{service.price}
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">{bn ? "থেকে" : "from"}</span>
                      </>
                    ) : (
                      <span className="text-primary">{bn ? "বুক করুন" : "Book Now"}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => handleAddToCart(e, service)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      title={bn ? "কার্টে যোগ করুন" : "Add to cart"}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleCompare(e, service)}
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-primary/10 ${
                        service.slug && isInCompare(service.slug)
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                      title={bn ? "তুলনা করুন" : "Compare"}
                      aria-label={bn ? "তুলনা করুন" : "Compare"}
                    >
                      <GitCompareArrows className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleShare(e, service)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      title={bn ? "শেয়ার করুন" : "Share"}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </ServiceCardWrapper>
          ))}
        </div>
      </div>

      {/* Share popup rendered via portal */}
      <AnimatePresence>
        {shareState && (
          <SharePopup
            slug={shareState.slug}
            title={shareState.title}
            anchorRect={shareState.rect}
            onClose={closeShare}
          />
        )}
      </AnimatePresence>

      {/* Long-press quick action sheet (mobile) */}
      <AnimatePresence>
        {quickMenu && createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickMenu(null)}
              className="fixed inset-0 z-[300] bg-foreground/50 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[301] rounded-t-2xl border-t border-border bg-background shadow-2xl md:hidden"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex items-center gap-3 px-4 pt-1 pb-3 border-b border-border">
                <img src={quickMenu.image} alt={quickMenu.title} className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold text-foreground">{quickMenu.title}</h4>
                  {quickMenu.price ? (
                    <p className="text-xs text-muted-foreground">৳{quickMenu.price} {bn ? "থেকে" : "from"}</p>
                  ) : null}
                </div>
                <button
                  onClick={() => setQuickMenu(null)}
                  aria-label={bn ? "বন্ধ" : "Close"}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-2 py-2">
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    if (quickMenu.slug) navigate(`/service/${quickMenu.slug}`);
                    setQuickMenu(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Eye className="h-4 w-4" />
                  </span>
                  {bn ? "বিস্তারিত দেখুন" : "View details"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!quickMenu.slug) return;
                    haptic("medium");
                    addItem({
                      serviceSlug: quickMenu.slug,
                      serviceTitle: quickMenu.title,
                      serviceImage: quickMenu.image,
                      packageName: quickMenu.packageName || (bn ? "বেসিক" : "Basic"),
                      packagePrice: quickMenu.price || 0,
                    });
                    toast.success(bn ? "কার্টে যোগ হয়েছে!" : "Added to cart!");
                    setQuickMenu(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShoppingCart className="h-4 w-4" />
                  </span>
                  {bn ? "কার্টে যোগ করুন" : "Add to cart"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!quickMenu.slug) return;
                    haptic("light");
                    const url = `${window.location.origin}/service/${quickMenu.slug}`;
                    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
                    if (nav.share) {
                      try { await nav.share({ title: quickMenu.title, url }); } catch { /* cancelled */ }
                    } else {
                      await navigator.clipboard.writeText(url);
                      toast.success(bn ? "লিংক কপি হয়েছে!" : "Link copied!");
                    }
                    setQuickMenu(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Share2 className="h-4 w-4" />
                  </span>
                  {bn ? "শেয়ার করুন" : "Share"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    handleCompare(e as unknown as React.MouseEvent, quickMenu);
                    setQuickMenu(null);
                  }}
                  disabled={!quickMenu.cmsService}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <GitCompareArrows className="h-4 w-4" />
                  </span>
                  {quickMenu.slug && isInCompare(quickMenu.slug)
                    ? (bn ? "তুলনা থেকে সরান" : "Remove from compare")
                    : (bn ? "তুলনায় যোগ করুন" : "Add to compare")}
                </button>
              </div>
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>
    </motion.section>
  );
});

export default ServiceSection;