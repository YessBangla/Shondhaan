import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Clock, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface ActiveBooking {
  id: string;
  service_title: string;
  status: string;
  booking_date: string;
  booking_time: string;
}

const STATUS_LABEL: Record<string, { bn: string; en: string; pct: number; color: string }> = {
  pending:     { bn: "অপেক্ষমাণ",  en: "Awaiting confirmation", pct: 25, color: "from-amber-500/90 to-amber-600/90" },
  confirmed:   { bn: "নিশ্চিত",     en: "Confirmed",             pct: 50, color: "from-blue-500/90 to-blue-600/90" },
  in_progress: { bn: "চলমান",      en: "In progress",           pct: 80, color: "from-purple-500/90 to-purple-600/90" },
};

const DISMISS_KEY_PREFIX = "yess_live_activity_dismissed_";

/**
 * iOS Live-Activity-style sticky bar pinned to the top of the screen on
 * mobile when the user has at least one active booking. Tapping opens
 * the booking history. Dismissable per booking-id (re-shows on status
 * change because dismissal is keyed by id+status).
 */
const LiveActivityBar = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const bn = language === "bn";
  const [active, setActive] = useState<ActiveBooking | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Hide on auth page and admin/staff panels to keep them distraction-free
  const hiddenRoutes = ["/auth", "/admin", "/super-admin", "/finance", "/representative", "/call-center", "/provider", "/moderator", "/supervisor"];
  const onHiddenRoute = hiddenRoutes.some((r) => location.pathname.startsWith(r));

  useEffect(() => {
    if (!user) { setActive(null); return; }
    let cancelled = false;

    const fetchActive = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, service_title, status, booking_date, booking_time")
        .eq("user_id", user.id)
        .in("status", ["pending", "confirmed", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setActive(data as ActiveBooking | null);
      if (data) {
        const key = DISMISS_KEY_PREFIX + data.id + "_" + data.status;
        try { setDismissed(localStorage.getItem(key) === "1"); } catch { setDismissed(false); }
      }
    };

    fetchActive();
    const channel = supabase
      .channel("live-activity-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` },
        () => fetchActive(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!active || dismissed || onHiddenRoute) return null;
  const meta = STATUS_LABEL[active.status];
  if (!meta) return null;

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try { localStorage.setItem(DISMISS_KEY_PREFIX + active.id + "_" + active.status, "1"); } catch { /* */ }
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={active.id + active.status}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="fixed left-2 right-2 z-[64] md:hidden"
        style={{ top: `calc(env(safe-area-inset-top, 0px) + 56px)` }}
      >
        <Link
          to="/bookings"
          className={`relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r ${meta.color} px-3 py-2.5 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md`}
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
            {active.status === "in_progress"
              ? <Truck className="h-4 w-4" />
              : <Clock className="h-4 w-4" />}
            <motion.span
              className="absolute inset-0 rounded-full bg-white/30"
              animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
              {bn ? meta.bn : meta.en}
            </p>
            <p className="truncate text-xs font-medium">
              {active.service_title} • {active.booking_date}
            </p>
          </div>
          {/* progress sliver */}
          <span
            className="absolute bottom-0 left-0 h-0.5 bg-white/80"
            style={{ width: `${meta.pct}%` }}
          />
          <ChevronRight className="h-4 w-4 opacity-80 shrink-0" />
          <button
            onClick={dismiss}
            className="absolute right-1 top-1 rounded-full bg-black/20 p-0.5"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveActivityBar;
