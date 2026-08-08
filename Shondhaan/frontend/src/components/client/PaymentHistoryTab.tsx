import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, Calendar, ArrowDownRight, ArrowUpRight, ShoppingBag, ClipboardList, Filter } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Booking {
  id: string;
  service_title: string;
  package_name: string;
  package_price: number;
  booking_date: string;
  status: string;
  created_at: string;
}

interface MartOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  customer_name: string;
}

interface Props {
  bookings: Booking[];
  martOrders?: MartOrder[];
}

type FilterType = "all" | "services" | "mart";

const PaymentHistoryTab = ({ bookings, martOrders = [] }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [filter, setFilter] = useState<FilterType>("all");

  const completedBookings = bookings.filter(b => b.status === "completed");
  const pendingBookings = bookings.filter(b => b.status === "pending" || b.status === "confirmed");
  const totalServiceSpent = completedBookings.reduce((sum, b) => sum + b.package_price, 0);
  const pendingServiceAmount = pendingBookings.reduce((sum, b) => sum + b.package_price, 0);

  const deliveredMart = martOrders.filter(o => o.status === "delivered");
  const activeMart = martOrders.filter(o => !["delivered", "cancelled", "return_requested"].includes(o.status));
  const totalMartSpent = deliveredMart.reduce((sum, o) => sum + o.total, 0);
  const pendingMartAmount = activeMart.reduce((sum, o) => sum + o.total, 0);

  const totalSpent = totalServiceSpent + totalMartSpent;
  const pendingAmount = pendingServiceAmount + pendingMartAmount;

  // Unified transaction list
  const allTransactions = useMemo(() => {
    const serviceItems = bookings.map(b => ({
      id: b.id,
      type: "service" as const,
      title: b.service_title,
      subtitle: b.package_name,
      amount: b.package_price,
      status: b.status,
      created_at: b.created_at,
    }));
    const martItems = martOrders.map(o => ({
      id: o.id,
      type: "mart" as const,
      title: `${bn ? "মার্ট অর্ডার" : "Mart Order"} #${o.order_number}`,
      subtitle: o.payment_method === "cod" ? (bn ? "ক্যাশ অন ডেলিভারি" : "COD") : o.payment_method.toUpperCase(),
      amount: o.total,
      status: o.status,
      created_at: o.created_at,
    }));
    let items = [...serviceItems, ...martItems];
    if (filter === "services") items = serviceItems;
    if (filter === "mart") items = martItems;
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bookings, martOrders, filter, bn]);

  // Monthly data
  const monthlyData = useMemo(() => {
    return allTransactions.reduce((acc, t) => {
      const month = new Date(t.created_at).toLocaleDateString("bn-BD", { year: "numeric", month: "short" });
      if (!acc[month]) acc[month] = { total: 0, count: 0 };
      acc[month].total += t.amount;
      acc[month].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
  }, [allTransactions, bn]);

  const getStatusInfo = (status: string, type: string) => {
    const isCompleted = status === "completed" || status === "delivered";
    const isCancelled = status === "cancelled" || status === "return_requested";
    return {
      isCompleted,
      isCancelled,
      label: isCompleted ? (bn ? "পেইড" : "Paid") : isCancelled ? (bn ? "বাতিল" : "Cancelled") : (bn ? "পেন্ডিং" : "Pending"),
      color: isCompleted ? "text-green-600" : isCancelled ? "text-red-500" : "text-yellow-600",
      bgColor: isCompleted ? "bg-green-100 dark:bg-green-900/30" : isCancelled ? "bg-red-100 dark:bg-red-900/30" : "bg-muted",
    };
  };

  const filterTabs: { key: FilterType; label: string; icon: any }[] = [
    { key: "all", label: bn ? "সব" : "All", icon: Filter },
    { key: "services", label: bn ? "সার্ভিস" : "Services", icon: ClipboardList },
    { key: "mart", label: bn ? "মার্ট" : "Mart", icon: ShoppingBag },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{bn ? "মোট খরচ" : "Total Spent"}</span>
          </div>
          <p className="text-xl font-bold text-foreground">৳{totalSpent.toLocaleString("bn-BD")}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-[9px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              {bn ? "সার্ভিস" : "Service"}: ৳{totalServiceSpent.toLocaleString("bn-BD")}
            </span>
            <span className="text-[9px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              {bn ? "মার্ট" : "Mart"}: ৳{totalMartSpent.toLocaleString("bn-BD")}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-yellow-500/10 p-1.5">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{bn ? "চলমান বিল" : "Pending"}</span>
          </div>
          <p className="text-xl font-bold text-foreground">৳{pendingAmount.toLocaleString("bn-BD")}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {pendingBookings.length + activeMart.length} {bn ? "টি চলমান" : "active"}
          </p>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {filterTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === tab.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Icon className="h-3 w-3" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Monthly Breakdown */}
      {Object.keys(monthlyData).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {bn ? "মাসিক খরচ" : "Monthly Spending"}
          </h3>
          <div className="space-y-2">
            {Object.entries(monthlyData).slice(0, 6).map(([month, data]) => (
              <div key={month} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-xs text-muted-foreground">{month}</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-foreground">৳{data.total.toLocaleString("bn-BD")}</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">({data.count} {bn ? "টি" : "orders"})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3">{bn ? "লেনদেনের ইতিহাস" : "Transaction History"}</h3>
        {allTransactions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">{bn ? "কোনো লেনদেন নেই" : "No transactions"}</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allTransactions.map((t, i) => {
              const info = getStatusInfo(t.status, t.type);
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                >
                  <div className={`rounded-full p-1.5 ${info.bgColor}`}>
                    {info.isCancelled ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                      <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold ${
                        t.type === "mart" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-primary/10 text-primary"
                      }`}>
                        {t.type === "mart" ? (bn ? "মার্ট" : "Mart") : (bn ? "সার্ভিস" : "Service")}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{t.subtitle} • {new Date(t.created_at).toLocaleDateString("bn-BD")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${info.isCancelled ? "text-red-500 line-through" : "text-foreground"}`}>৳{t.amount.toLocaleString("bn-BD")}</p>
                    <p className={`text-[9px] font-medium ${info.color}`}>{info.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryTab;
