import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Calendar, Clock, MapPin, Star, RotateCcw, Eye, MessageCircle, Share2, Copy, MoreVertical, Archive } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLongPress } from "@/hooks/useLongPress";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Booking {
  id: string;
  service_title: string;
  service_slug: string;
  package_name: string;
  package_price: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
  is_emergency: boolean;
}

const statusMap: Record<string, { label: string; labelEn: string; className: string; icon: string }> = {
  pending: { label: "অপেক্ষমাণ", labelEn: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: "⏳" },
  confirmed: { label: "নিশ্চিত", labelEn: "Confirmed", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: "✅" },
  in_progress: { label: "চলমান", labelEn: "In Progress", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: "🔄" },
  completed: { label: "সম্পন্ন", labelEn: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: "🎉" },
  cancelled: { label: "বাতিল", labelEn: "Cancelled", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: "❌" },
};

const statusSteps = ["pending", "confirmed", "in_progress", "completed"];

interface Props {
  booking: Booking;
  index: number;
  onNavigate: (path: string) => void;
  onReview: (booking: Booking) => void;
  onRebook: (booking: Booking) => void;
  onChat: (booking: Booking) => void;
  hasReview: boolean;
}

const BookingCard = ({ booking: b, index, onNavigate, onReview, onRebook, onChat, hasReview }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const s = statusMap[b.status] || statusMap.pending;
  const currentStep = statusSteps.indexOf(b.status);
  const isCancelled = b.status === "cancelled";
  const isCompleted = b.status === "completed";
  const [actionsOpen, setActionsOpen] = useState(false);
  const longPressHandlers = useLongPress<HTMLDivElement>(() => setActionsOpen(true), 480);
  const [archived, setArchived] = useState(false);
  const x = useMotionValue(0);
  const actionOpacity = useTransform(x, [-120, -40, 0], [1, 0.5, 0]);
  const archiveScale = useTransform(x, [-120, -60], [1, 0.85]);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -110) {
      haptic("medium");
      animate(x, -window.innerWidth, { duration: 0.25, onComplete: () => setArchived(true) });
      toast(bn ? "বুকিং আর্কাইভ হয়েছে" : "Booking archived", {
        action: {
          label: bn ? "আনডু" : "Undo",
          onClick: () => {
            setArchived(false);
            animate(x, 0, { type: "spring", stiffness: 320, damping: 26 });
          },
        },
      });
    } else {
      animate(x, 0, { type: "spring", stiffness: 320, damping: 26 });
    }
  };

  if (archived) return null;

  const copyId = async () => {
    haptic("light");
    try {
      await navigator.clipboard.writeText(b.id);
      toast.success(bn ? "বুকিং আইডি কপি হয়েছে" : "Booking ID copied");
    } catch {
      toast.error(bn ? "কপি করা যায়নি" : "Copy failed");
    }
    setActionsOpen(false);
  };

  const shareBooking = async () => {
    haptic("light");
    const url = `${window.location.origin}/service/${b.service_slug}`;
    const text = `${b.service_title} — ৳${b.package_price}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: b.service_title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(bn ? "লিংক কপি হয়েছে" : "Link copied");
      }
    } catch {/* user cancelled */}
    setActionsOpen(false);
  };

  return (
    <>
    <div className="relative">
      {/* Reveal layer behind the card — visible only while swiping */}
      <motion.div
        style={{ opacity: actionOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-xl bg-destructive/90 pr-6 text-destructive-foreground md:hidden"
      >
        <motion.div style={{ scale: archiveScale }} className="flex flex-col items-center gap-1">
          <Archive className="h-5 w-5" />
          <span className="text-[10px] font-bold tracking-wide">
            {bn ? "আর্কাইভ" : "ARCHIVE"}
          </span>
        </motion.div>
      </motion.div>
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: -160, right: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      style={{ x }}
      className="relative rounded-xl border border-border bg-card p-4 shadow-sm select-none touch-pan-y md:select-auto"
      {...longPressHandlers}
    >
      <button
        onClick={() => setActionsOpen(true)}
        className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden"
        aria-label="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <button
            onClick={() => onNavigate(`/service/${b.service_slug}`)}
            className="font-heading text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            {b.service_title}
          </button>
          <p className="text-xs text-muted-foreground">{b.package_name} — ৳{b.package_price}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium flex items-center gap-1 ${s.className}`}>
          <span>{s.icon}</span> {bn ? s.label : s.labelEn}
        </span>
      </div>

      {/* Progress tracker */}
      {!isCancelled && (
        <div className="mb-3">
          <div className="flex items-center gap-1">
            {statusSteps.map((step, i) => {
              const isActive = i <= currentStep;
              const stepInfo = statusMap[step];
              return (
                <div key={step} className="flex-1 flex items-center">
                  <div className={`h-1.5 w-full rounded-full transition-all ${isActive ? "bg-primary" : "bg-muted"}`} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            {statusSteps.map((step) => {
              const stepInfo = statusMap[step];
              return (
                <span key={step} className="text-[8px] text-muted-foreground">
                  {bn ? stepInfo.label : stepInfo.labelEn}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.booking_date}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.booking_time}</span>
        <span className="flex items-center gap-1 col-span-2"><MapPin className="h-3 w-3 shrink-0" /> {b.customer_address}</span>
      </div>

      {b.is_emergency && (
        <span className="inline-block mb-2 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">
          🚨 {bn ? "জরুরী" : "Emergency"}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={() => onNavigate(`/service/${b.service_slug}`)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Eye className="h-3 w-3" /> {bn ? "বিস্তারিত" : "Details"}
        </button>

        {!isCancelled && (
          <button
            onClick={() => onChat(b)}
            className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
          >
            <MessageCircle className="h-3 w-3" /> {bn ? "চ্যাট" : "Chat"}
          </button>
        )}

        {isCompleted && !hasReview && (
          <button
            onClick={() => onReview(b)}
            className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
          >
            <Star className="h-3 w-3" /> {bn ? "রিভিউ দিন" : "Write Review"}
          </button>
        )}

        {(isCompleted || isCancelled) && (
          <button
            onClick={() => onRebook(b)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors ml-auto"
          >
            <RotateCcw className="h-3 w-3" /> {bn ? "পুনরায় বুক করুন" : "Rebook"}
          </button>
        )}
      </div>
    </motion.div>
    </div>
    <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
      <DrawerContent className="pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-sm font-semibold line-clamp-1">{b.service_title}</DrawerTitle>
          <p className="text-[11px] text-muted-foreground">{b.package_name} — ৳{b.package_price}</p>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-1">
          <ActionRow icon={<Eye className="h-4 w-4" />} label={bn ? "বিস্তারিত দেখুন" : "View details"} onClick={() => { setActionsOpen(false); onNavigate(`/service/${b.service_slug}`); }} />
          {!isCancelled && (
            <ActionRow icon={<MessageCircle className="h-4 w-4" />} label={bn ? "চ্যাট করুন" : "Open chat"} onClick={() => { setActionsOpen(false); onChat(b); }} />
          )}
          {(isCompleted || isCancelled) && (
            <ActionRow icon={<RotateCcw className="h-4 w-4" />} label={bn ? "পুনরায় বুক করুন" : "Re-book"} onClick={() => { setActionsOpen(false); onRebook(b); }} />
          )}
          {isCompleted && !hasReview && (
            <ActionRow icon={<Star className="h-4 w-4" />} label={bn ? "রিভিউ দিন" : "Write a review"} onClick={() => { setActionsOpen(false); onReview(b); }} />
          )}
          <ActionRow icon={<Share2 className="h-4 w-4" />} label={bn ? "শেয়ার করুন" : "Share"} onClick={shareBooking} />
          <ActionRow icon={<Copy className="h-4 w-4" />} label={bn ? "বুকিং আইডি কপি" : "Copy booking ID"} onClick={copyId} />
        </div>
      </DrawerContent>
    </Drawer>
    </>
  );
};

const ActionRow = ({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors active:scale-[0.98] ${danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted"}`}
  >
    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{icon}</span>
    {label}
  </button>
);

export default BookingCard;
