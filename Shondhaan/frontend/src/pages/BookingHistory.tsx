import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Phone, ChevronLeft, Package, ChevronRight, Wallet, CreditCard, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { listBookings } from "@/lib/bookingApi";
import { getMySqlAuth } from "@/lib/mysqlAuth";

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
  payment_status?: string | null;
  payment_amount?: number | null;
  platform_fee_amount?: number | null;
  due_amount?: number | null;
  created_at: string;
}

// Status → visual family
const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  confirmed: "bg-primary/10 text-primary dark:bg-primary/15",
  processing: "bg-primary/10 text-primary dark:bg-primary/15",
  assigned: "bg-primary/10 text-primary dark:bg-primary/15",
  completed: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  cancelled: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

const BookingCardSkeleton = () => (
  <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="space-y-2 w-2/3">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
      <div className="h-6 w-16 rounded-md bg-muted" />
    </div>
    <div className="grid grid-cols-2 gap-3 mb-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-8 rounded bg-muted" />
      ))}
    </div>
    <div className="h-px bg-border mb-3" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-3 w-full rounded bg-muted" />
      ))}
    </div>
  </div>
);

const BookingHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const bn = language === "bn";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const mysqlUser = getMySqlAuth()?.user;
  const activeUserId = mysqlUser?.id || user?.id;

  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { label: t("bh.pending"), className: statusStyles.pending },
    confirmed: { label: t("bh.confirmed"), className: statusStyles.confirmed },
    processing: { label: t("bh.confirmed"), className: statusStyles.processing },
    assigned: { label: t("bh.confirmed"), className: statusStyles.assigned },
    completed: { label: t("bh.completed"), className: statusStyles.completed },
    cancelled: { label: t("bh.cancelled"), className: statusStyles.cancelled },
  };

  useEffect(() => {
    if (!authLoading && !activeUserId) {
      navigate("/login", { replace: true });
    }
  }, [activeUserId, authLoading, navigate]);

  const fetchBookings = async () => {
    if (!activeUserId) {
      setLoading(false);
      return;
    }

    try {
      const data = await listBookings({ user_id: activeUserId });
      setBookings(data as Booking[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeUserId]);

  const { pull, refreshing } = usePullToRefresh(async () => {
    await fetchBookings();
  });

  /**
   * Calculate remaining payment:
   * - If due_amount is provided by backend, use it directly
   * - Otherwise calculate: package_price - payment_amount
   */
  const getRemainingPayment = (b: Booking): number => {
    if (b.due_amount !== null && b.due_amount !== undefined) {
      return Number(b.due_amount);
    }
    const paid = Number(b.payment_amount || 0);
    const total = Number(b.package_price || 0);
    return Math.max(0, total - paid);
  };

  /**
   * Get the advance/payment amount already paid
   */
  const getPaidAmount = (b: Booking): number => {
    return Number(b.payment_amount || 0);
  };

  /**
   * Get platform fee
   */
  const getPlatformFee = (b: Booking): number => {
    return Number(b.platform_fee_amount || 0);
  };

  /**
   * Check if remaining payment needs to be shown
   * - Don't show for cancelled bookings
   * - Don't show if remaining is 0
   */
  const shouldShowRemaining = (b: Booking): boolean => {
    if (b.status === "cancelled") return false;
    return getRemainingPayment(b) > 0;
  };

  /**
   * Check if it's a completed service that needs payment
   */
  const isPayableAfterService = (b: Booking): boolean => {
    return b.status === "completed" && getRemainingPayment(b) > 0;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar />
      <div className="pt-[44px] md:pt-[25px]" />

      <div className="app-container py-6 md:py-10 flex-1">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-4 w-4" /> {t("bh.goBack")}
        </button>

        <div className="flex items-center gap-2.5 mb-6">
          <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground">{t("bh.title")}</h1>
          {!authLoading && !loading && bookings.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {bookings.length}
            </span>
          )}
        </div>

        {authLoading || loading ? (
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center py-20 px-4 rounded-lg border border-dashed border-border bg-card/50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Package className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">{t("bh.noBookings")}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("bh.viewServices")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 items-start">
            {bookings.map((b, i) => {
              const s = statusMap[b.status] || statusMap.pending;
              const isPaid = b.payment_status === "paid";
              const feeAmount = getPlatformFee(b);
              const paidAmount = getPaidAmount(b);
              const remainingAmount = getRemainingPayment(b);
              const showRemaining = shouldShowRemaining(b);
              const payableAfterService = isPayableAfterService(b);
              const totalAmount = Number(b.package_price || 0);

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.04 }}
                  className={`rounded-lg border bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 ${
                    payableAfterService
                      ? "border-amber-400/60 hover:border-amber-500/70 ring-1 ring-amber-400/20"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {/* Header: Title + Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <button
                        onClick={() => navigate(`/service/${b.service_slug}`)}
                        className="font-heading text-sm sm:text-[15px] font-semibold text-foreground hover:text-primary transition-colors text-left"
                      >
                        {b.service_title}
                      </button>
                      <p className="text-xs text-muted-foreground mt-1">
                        {b.package_name}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${s.className}`}>
                      {s.label}
                    </span>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="rounded-lg bg-muted/50 p-3 mb-3 space-y-2">
                    {/* Total Price */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {bn ? "মোট মূল্য" : "Total Price"}
                      </span>
                      <span className="font-semibold text-foreground">
                        ৳{totalAmount.toLocaleString("bn-BD")}
                      </span>
                    </div>

                    {/* Advance / Paid Amount */}
                    {paidAmount > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CreditCard className="h-3 w-3 shrink-0" />
                          {bn ? "পেমেন্ট করা হয়েছে" : "Paid"}
                        </span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          − ৳{paidAmount.toLocaleString("bn-BD")}
                        </span>
                      </div>
                    )}

                    {/* Platform Fee */}
                    {feeAmount > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {bn ? "প্ল্যাটফর্ম ফি" : "Platform Fee"}
                        </span>
                        <span
                          className={`font-medium ${
                            isPaid
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          ৳{feeAmount.toLocaleString("bn-BD")}
                          <span className="ml-1 text-[10px] font-normal opacity-70">
                            {isPaid ? (bn ? "পরিশোধিত" : "paid") : (bn ? "বকেয়া" : "due")}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Divider before remaining */}
                    {showRemaining && (
                      <div className="h-px bg-border" />
                    )}

                    {/* Remaining Payment — highlighted */}
                    {showRemaining && (
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`flex items-center gap-1.5 font-medium ${
                            payableAfterService
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {payableAfterService ? (
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <Wallet className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {payableAfterService
                            ? (bn ? "সার্ভিসের পর পরিশোধ করুন" : "Pay after service")
                            : (bn ? "বাকি পরিশোধ" : "Remaining")
                          }
                        </span>
                        <span
                          className={`font-bold text-sm ${
                            payableAfterService
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-foreground"
                          }`}
                        >
                          ৳{remainingAmount.toLocaleString("bn-BD")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pay Now button for completed services with remaining */}
                  {payableAfterService && (
                    <button
                      onClick={() => navigate(`/booking/${b.id}/pay-remaining`)}
                      className="w-full flex items-center justify-center gap-2 mb-3 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      {bn ? "বাকি ৳" + remainingAmount.toLocaleString("bn-BD") + " পরিশোধ করুন" : "Pay remaining ৳" + remainingAmount.toLocaleString("bn-BD")}
                    </button>
                  )}

                  <div className="h-px bg-border mb-3" />

                  {/* Booking Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{b.booking_date}</span>
                    </span>
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{b.booking_time}</span>
                    </span>
                    <span className="flex items-center gap-1.5 min-w-0 col-span-2 sm:col-span-1">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{b.customer_phone}</span>
                    </span>
                    <span className="flex items-start gap-1.5 col-span-2 sm:col-span-1 sm:items-center">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 sm:mt-0" />
                      <span className="line-clamp-2 sm:truncate">{b.customer_address}</span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default BookingHistory;