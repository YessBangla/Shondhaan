import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Phone, ChevronLeft, Package } from "lucide-react";
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
  due_amount?: number | null;
  created_at: string;
}

const BookingHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const mysqlUser = getMySqlAuth()?.user;
  const activeUserId = mysqlUser?.id || user?.id;

  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { label: t("bh.pending"), className: "bg-yellow-100 text-yellow-800" },
    confirmed: { label: t("bh.confirmed"), className: "bg-blue-100 text-blue-800" },
    processing: { label: t("bh.confirmed"), className: "bg-indigo-100 text-indigo-800" },
    assigned: { label: t("bh.confirmed"), className: "bg-purple-100 text-purple-800" },
    completed: { label: t("bh.completed"), className: "bg-green-100 text-green-800" },
    cancelled: { label: t("bh.cancelled"), className: "bg-red-100 text-red-800" },
  };

  useEffect(() => {
    if (!authLoading && !activeUserId) {
      navigate("/auth", { replace: true });
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> {t("bh.goBack")}
        </button>

        <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-6">{t("bh.title")}</h1>

        {bookings.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{t("bh.noBookings")}</p>
            <button onClick={() => navigate("/")} className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
              {t("bh.viewServices")}
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b, i) => {
              const s = statusMap[b.status] || statusMap.pending;
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <button
                        onClick={() => navigate(`/service/${b.service_slug}`)}
                        className="font-heading text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {b.service_title}
                      </button>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.package_name} — ৳{b.package_price}</p>
                      <p className="mt-1 text-[11px] font-medium text-primary">
                        20% platform fee: ৳{Number(b.payment_amount || 0).toLocaleString("bn-BD")}
                        {b.payment_status === "paid" ? " paid" : " unpaid"}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.className}`}>{s.label}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {b.booking_date}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {b.booking_time}</span>
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {b.customer_phone}</span>
                    <span className="flex items-center gap-1.5 col-span-2"><MapPin className="h-3.5 w-3.5 shrink-0" /> {b.customer_address}</span>
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
