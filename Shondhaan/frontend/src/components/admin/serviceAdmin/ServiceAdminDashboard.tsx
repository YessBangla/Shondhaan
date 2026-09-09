import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, Clock, MapPin, Phone, User, CalendarDays, CheckCircle2,
  Wallet, Receipt, Wrench, Loader2, Inbox, Banknote
} from "lucide-react";
import { cn } from "@/lib/utils";
import ProviderApprovalRequests from "@/components/super-admin/ProviderApprovalRequests";

// Type definitions based on the Booking JSON
type Booking = {
  id: string;
  service_title: string;
  package_name: string;
  package_price: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  booking_date: string;
  booking_time: string;
  status: string;
  payment_status: string;
  paid_amount: number;
  due_amount: number;
  payment_gateway: string | null;
  payment_transaction_id: string | null;
  platform_fee_amount: number;
  note: string | null;
};

const ServiceAdminDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SERVICE_API_BASE_URL || ""}/api/bookings`;
      console.log(`🌐 Fetching data from: ${apiUrl}`);
      
      const res = await fetch(apiUrl); 
      
      if (!res.ok) {
        console.error(`❌ HTTP Error: ${res.status} ${res.statusText}`);
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("❌ Server did not return JSON. It returned:", contentType);
        throw new Error("Expected JSON response but got something else (likely HTML). Check your API route!");
      }

      const data = await res.json();
      console.log("✅ Raw API Response:", data);

      let list: Booking[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data?.data)) {
        list = data.data;
      } else if (Array.isArray(data?.bookings)) {
        list = data.bookings;
      } else if (Array.isArray(data?.results)) {
        list = data.results;
      }

      console.log(`📦 Extracted bookings count: ${list.length}`, list);
      setBookings(list);

    } catch (error) {
      console.error("❌ Error fetching bookings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Calculate KPI Stats
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    paid: bookings.filter(b => b.payment_status === "paid").length,
    revenue: bookings.reduce((sum, b) => sum + (b.paid_amount || 0), 0),
  };

  // Helper to format time
  const formatTime = (time: string) => {
    if (!time) return "--";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${suffix}`;
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <div className="h-16 rounded-lg bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-lg bg-muted/40 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-80 rounded-lg bg-muted/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              সার্ভিস বুকিং ম্যানেজমেন্ট
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              সকল সার্ভিস বুকিং এবং পেমেন্ট স্ট্যাটাস একসাথে দেখুন
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            রিফ্রেশ
          </motion.button>
        </div>

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Inbox} label="মোট বুকিং" value={stats.total} color="blue" />
          <StatCard icon={Clock} label="পেন্ডিং বুকিং" value={stats.pending} color="amber" />
          <StatCard icon={CheckCircle2} label="সফল পেমেন্ট" value={stats.paid} color="emerald" />
          <StatCard icon={Wallet} label="মোট রেভিনিউ" value={`৳${stats.revenue.toLocaleString('bn-BD')}`} color="indigo" />
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <ProviderApprovalRequests />
        </section>

        {/* Bookings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {bookings.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
              <Inbox className="h-14 w-14 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">কোনো বুকিং পাওয়া যায়নি</p>
            </div>
          ) : (
            bookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                whileHover={{ y: -4, shadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
                className="flex flex-col rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                {/* Card Header: Service Info & Status */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Wrench className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-sm leading-snug line-clamp-2">
                          {booking.service_title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{booking.package_name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                      booking.status === "pending" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : 
                      booking.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                      "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                    )}>
                      {booking.status}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                      booking.payment_status === "paid" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                    )}>
                      <Banknote className="h-3 w-3" />
                      {booking.payment_status}
                    </span>
                  </div>
                </div>

                {/* Card Body: Customer & Schedule Info */}
                <div className="p-5 space-y-4 flex-grow">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="font-medium text-slate-900 dark:text-slate-50 truncate">{booking.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-400">{booking.customer_phone}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span className="text-slate-600 dark:text-slate-400 line-clamp-2">{booking.customer_address}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(booking.booking_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(booking.booking_time)}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Financials */}
                <div className="bg-slate-50 dark:bg-slate-700/50 p-5 border-t border-slate-100 dark:border-slate-700">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">প্যাকেজ</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-50 mt-1">৳{booking.package_price}</p>
                    </div>
                    <div className="text-center border-l border-r border-slate-200 dark:border-slate-600">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">পেইড</p>
                      <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">৳{booking.paid_amount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">বাকি</p>
                      <p className={cn("text-base font-semibold mt-1", booking.due_amount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500")}>
                        ৳{booking.due_amount}
                      </p>
                    </div>
                  </div>

                  {booking.payment_gateway && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 capitalize font-medium">
                        <Receipt className="h-3.5 w-3.5" /> {booking.payment_gateway}
                      </span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">TXN: {booking.payment_transaction_id?.slice(-6)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Reusable Stat Card Component
const StatCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: any, color: string }) => {
  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    blue:    { bg: "bg-blue-50 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
    indigo:  { bg: "bg-indigo-50 dark:bg-indigo-900/20", icon: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800" },
    amber:   { bg: "bg-amber-50 dark:bg-amber-900/20", icon: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  };

  const c = colorMap[color];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn("rounded-lg border p-6 bg-white dark:bg-slate-800 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow", c.border)}
    >
      <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center shrink-0", c.bg)}>
        <Icon className={cn("h-6 w-6", c.icon)} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">{value}</p>
      </div>
    </motion.div>
  );
};

export default ServiceAdminDashboard;
