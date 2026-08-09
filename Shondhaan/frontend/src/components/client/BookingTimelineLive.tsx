import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Truck, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props { bookingId: string; initialStatus?: string; }

const STAGES = [
  { key: "pending", icon: Clock },
  { key: "confirmed", icon: Check },
  { key: "in_progress", icon: Truck },
  { key: "completed", icon: MapPin },
];

/**
 * Realtime booking timeline. Subscribes to the bookings row and animates
 * the active stage. Pure presentational — no business logic.
 */
const BookingTimelineLive = ({ bookingId, initialStatus = "pending" }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [status, setStatus] = useState(initialStatus);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const ch = supabase
      .channel(`booking-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        (payload) => {
          const next = (payload.new as { status?: string })?.status;
          if (next && next !== status) {
            setStatus(next);
            setPulse((p) => p + 1);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId, status]);

  const labels: Record<string, string> = bn
    ? { pending: "অপেক্ষমাণ", confirmed: "কনফার্ম", in_progress: "চলমান", completed: "সম্পন্ন" }
    : { pending: "Pending", confirmed: "Confirmed", in_progress: "In progress", completed: "Completed" };

  const activeIdx = Math.max(0, STAGES.findIndex((s) => s.key === status));

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {bn ? "লাইভ অগ্রগতি" : "Live progress"}
      </div>
      <div className="relative flex items-center justify-between">
        <div className="absolute left-3 right-3 top-3.5 h-0.5 bg-muted" />
        <motion.div
          key={pulse}
          className="absolute left-3 top-3.5 h-0.5 origin-left bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `calc(${(activeIdx / (STAGES.length - 1)) * 100}% - ${activeIdx === 0 ? 0 : 12}px)` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const done = i <= activeIdx;
          const current = i === activeIdx;
          return (
            <div key={s.key} className="relative z-10 flex flex-col items-center">
              <motion.div
                animate={current ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={current ? { repeat: Infinity, duration: 1.6 } : {}}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </motion.div>
              <span className={`mt-1.5 text-[10px] font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                {labels[s.key] || s.key}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingTimelineLive;
