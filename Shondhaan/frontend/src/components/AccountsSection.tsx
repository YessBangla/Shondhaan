import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, TrendingDown, Receipt, Download, Filter,
  Calendar, CreditCard, FileText, ArrowUpRight, ArrowDownRight,
  ChevronDown, Printer, BarChart3, PieChartIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from "recharts";

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)",
  "hsl(330, 81%, 60%)", "hsl(172, 66%, 50%)"
];

type RoleType = "admin" | "representative" | "call_center" | "provider";

interface AccountsSectionProps {
  userId: string;
  role: RoleType;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: string;
  receiptNumber?: string;
  customerName: string;
  category: string;
  type: "earning" | "commission" | "booking";
}

const AccountsSection = ({ userId, role }: AccountsSectionProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<"weekly" | "monthly">("weekly");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const txns: Transaction[] = [];

    if (role === "admin") {
      // Admin sees all service_requests with payment data
      const { data: requests } = await (supabase as any)
        .from("service_requests")
        .select("*")
        .gt("payment_amount", 0)
        .order("created_at", { ascending: false });

      if (requests) {
        requests.forEach((r: any) => {
          txns.push({
            id: r.id,
            date: r.created_at,
            description: r.service_description?.slice(0, 60) || "সার্ভিস",
            amount: r.payment_amount || 0,
            commission: r.commission_amount || 0,
            netAmount: (r.payment_amount || 0) - (r.commission_amount || 0),
            status: r.payment_status,
            customerName: r.customer_name,
            category: r.service_description?.split(" ")[0] || "সার্ভিস",
            type: "earning",
          });
        });
      }

      // Also fetch bookings with payment
      const { data: bookings } = await (supabase as any)
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bookings) {
        bookings.forEach((b: any) => {
          txns.push({
            id: b.id,
            date: b.created_at,
            description: `${b.service_title} - ${b.package_name}`,
            amount: b.package_price || 0,
            commission: 0,
            netAmount: b.package_price || 0,
            status: b.status === "completed" ? "paid" : b.status === "cancelled" ? "cancelled" : "unpaid",
            customerName: b.customer_name,
            category: b.service_title || "বুকিং",
            type: "booking",
          });
        });
      }
    } else if (role === "representative") {
      // Rep sees own earnings
      const { data: earnings } = await (supabase as any)
        .from("rep_earnings")
        .select("*, service_requests(customer_name, service_description)")
        .eq("rep_id", userId)
        .order("created_at", { ascending: false });

      if (earnings) {
        earnings.forEach((e: any) => {
          txns.push({
            id: e.id,
            date: e.created_at,
            description: e.service_requests?.service_description?.slice(0, 60) || "সার্ভিস",
            amount: e.total_amount,
            commission: e.commission_amount,
            netAmount: e.rep_earning,
            status: e.status,
            receiptNumber: e.receipt_number,
            customerName: e.service_requests?.customer_name || "—",
            category: e.service_requests?.service_description?.split(" ")[0] || "সার্ভিস",
            type: "earning",
          });
        });
      }
    } else if (role === "call_center") {
      // Call center sees requests they've handled
      const { data: requests } = await (supabase as any)
        .from("service_requests")
        .select("*")
        .gt("payment_amount", 0)
        .order("created_at", { ascending: false });

      if (requests) {
        requests.forEach((r: any) => {
          txns.push({
            id: r.id,
            date: r.created_at,
            description: r.service_description?.slice(0, 60) || "সার্ভিস",
            amount: r.payment_amount || 0,
            commission: r.commission_amount || 0,
            netAmount: r.rep_earning || 0,
            status: r.payment_status,
            customerName: r.customer_name,
            category: r.service_description?.split(" ")[0] || "সার্ভিস",
            type: "earning",
          });
        });
      }
    } else if (role === "provider") {
      // Provider sees bookings assigned to them
      const { data: bookings } = await (supabase as any)
        .from("bookings")
        .select("*")
        .eq("provider_id", userId)
        .order("created_at", { ascending: false });

      if (bookings) {
        bookings.forEach((b: any) => {
          txns.push({
            id: b.id,
            date: b.created_at,
            description: `${b.service_title} - ${b.package_name}`,
            amount: b.package_price || 0,
            commission: 0,
            netAmount: b.package_price || 0,
            status: b.status === "completed" ? "paid" : b.status === "cancelled" ? "cancelled" : "unpaid",
            customerName: b.customer_name,
            category: b.service_title || "বুকিং",
            type: "booking",
          });
        });
      }
    }

    setTransactions(txns);
    setLoading(false);
  }, [userId, role]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.date) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [transactions, statusFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const totalRevenue = filtered.filter(t => t.status === "paid").reduce((sum, t) => sum + t.amount, 0);
    const totalCommission = filtered.filter(t => t.status === "paid").reduce((sum, t) => sum + t.commission, 0);
    const totalNet = filtered.filter(t => t.status === "paid").reduce((sum, t) => sum + t.netAmount, 0);
    const totalPending = filtered.filter(t => t.status === "unpaid" || t.status === "partial").reduce((sum, t) => sum + t.amount, 0);
    const paidCount = filtered.filter(t => t.status === "paid").length;
    const unpaidCount = filtered.filter(t => t.status !== "paid" && t.status !== "cancelled").length;
    return { totalRevenue, totalCommission, totalNet, totalPending, paidCount, unpaidCount };
  }, [filtered]);

  const chartData = useMemo(() => {
    const paidTxns = transactions.filter(t => t.status === "paid");
    const grouped: Record<string, { revenue: number; commission: number; net: number }> = {};

    paidTxns.forEach(t => {
      const d = new Date(t.date);
      let key: string;
      if (chartPeriod === "weekly") {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        key = `${startOfWeek.getDate().toString().padStart(2, "0")}/${(startOfWeek.getMonth() + 1).toString().padStart(2, "0")}`;
      } else {
        const months = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
        key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      }
      if (!grouped[key]) grouped[key] = { revenue: 0, commission: 0, net: 0 };
      grouped[key].revenue += t.amount;
      grouped[key].commission += t.commission;
      grouped[key].net += t.netAmount;
    });

    return Object.entries(grouped).map(([name, val]) => ({
      name,
      রেভিনিউ: Math.round(val.revenue),
      কমিশন: Math.round(val.commission),
      নেট_আয়: Math.round(val.net),
    }));
  }, [transactions, chartPeriod]);

  const categoryData = useMemo(() => {
    const paidTxns = transactions.filter(t => t.status === "paid");
    const grouped: Record<string, number> = {};
    paidTxns.forEach(t => {
      const cat = t.category.length > 15 ? t.category.slice(0, 15) + "…" : t.category;
      grouped[cat] = (grouped[cat] || 0) + t.amount;
    });
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [transactions]);

  const exportCSV = () => {
    const headers = ["তারিখ", "গ্রাহক", "বিবরণ", "মোট টাকা", "কমিশন", "নেট আয়", "স্ট্যাটাস", "রশিদ নং"];
    const rows = filtered.map(t => [
      new Date(t.date).toLocaleDateString("bn-BD"),
      t.customerName,
      t.description,
      t.amount,
      t.commission,
      t.netAmount,
      t.status === "paid" ? "পরিশোধিত" : t.status === "unpaid" ? "বাকি" : t.status,
      t.receiptNumber || "—",
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accounts_${role}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ফাইল ডাউনলোড হচ্ছে");
  };

  const printReceipt = (txn: Transaction) => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>রশিদ - ${txn.receiptNumber || txn.id.slice(0, 8)}</title>
      <style>body{font-family:sans-serif;padding:20px;font-size:14px}
      .header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
      .total{font-weight:bold;font-size:16px;margin-top:10px;padding-top:10px;border-top:2px solid #000}
      @media print{button{display:none}}</style></head><body>
      <div class="header">
        <h2 style="margin:0">সার্ভিস রশিদ</h2>
        <p style="margin:4px 0;color:#666">${txn.receiptNumber || "RCP-" + txn.id.slice(0, 8).toUpperCase()}</p>
        <p style="margin:4px 0;color:#666">${new Date(txn.date).toLocaleDateString("bn-BD")}</p>
      </div>
      <div class="row"><span>গ্রাহক:</span><span>${txn.customerName}</span></div>
      <div class="row"><span>সার্ভিস:</span><span>${txn.description}</span></div>
      <div class="row"><span>মোট টাকা:</span><span>৳${txn.amount.toLocaleString("bn-BD")}</span></div>
      <div class="row"><span>কমিশন (${role === "admin" ? "কোম্পানি" : "কর্তন"}):</span><span>৳${txn.commission.toLocaleString("bn-BD")}</span></div>
      <div class="row total"><span>নেট ${role === "representative" ? "প্রাপ্তি" : "আয়"}:</span><span>৳${txn.netAmount.toLocaleString("bn-BD")}</span></div>
      <div style="text-align:center;margin-top:20px;color:#999;font-size:12px">
        <p>স্ট্যাটাস: ${txn.status === "paid" ? "✅ পরিশোধিত" : "⏳ বাকি"}</p>
      </div>
      <div style="text-align:center;margin-top:15px">
        <button onclick="window.print()" style="padding:8px 24px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer">প্রিন্ট করুন</button>
      </div>
      </body></html>
    `);
    w.document.close();
  };

  const getSummaryCards = () => {
    if (role === "admin") {
      return [
        { label: "মোট রেভিনিউ", value: summary.totalRevenue, icon: Wallet, color: "text-primary" },
        { label: "মোট কমিশন", value: summary.totalCommission, icon: TrendingUp, color: "text-green-600" },
        { label: "প্রতিনিধি পেমেন্ট", value: summary.totalNet, icon: TrendingDown, color: "text-orange-600" },
        { label: "বাকি পেমেন্ট", value: summary.totalPending, icon: CreditCard, color: "text-red-600" },
      ];
    }
    if (role === "representative") {
      return [
        { label: "মোট আয়", value: summary.totalNet, icon: Wallet, color: "text-primary" },
        { label: "মোট কমিশন কর্তন", value: summary.totalCommission, icon: TrendingDown, color: "text-red-500" },
        { label: "মোট সার্ভিসমূল্য", value: summary.totalRevenue, icon: TrendingUp, color: "text-green-600" },
        { label: "মোট লেনদেন", value: summary.paidCount, icon: Receipt, color: "text-blue-600", isCount: true },
      ];
    }
    if (role === "call_center") {
      return [
        { label: "মোট লেনদেন", value: summary.totalRevenue, icon: Wallet, color: "text-primary" },
        { label: "পেমেন্ট সম্পন্ন", value: summary.paidCount, icon: Receipt, color: "text-green-600", isCount: true },
        { label: "বাকি পেমেন্ট", value: summary.totalPending, icon: CreditCard, color: "text-red-600" },
        { label: "মোট কমিশন", value: summary.totalCommission, icon: TrendingUp, color: "text-orange-600" },
      ];
    }
    // provider
    return [
      { label: "মোট আয়", value: summary.totalRevenue, icon: Wallet, color: "text-primary" },
      { label: "সম্পন্ন বুকিং", value: summary.paidCount, icon: Receipt, color: "text-green-600", isCount: true },
      { label: "বাকি বুকিং", value: summary.unpaidCount, icon: CreditCard, color: "text-orange-600", isCount: true },
      { label: "বাকি পেমেন্ট", value: summary.totalPending, icon: TrendingDown, color: "text-red-600" },
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {getSummaryCards().map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`rounded-lg bg-secondary p-1.5 ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{card.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {(card as any).isCount ? card.value : `৳${card.value.toLocaleString("bn-BD")}`}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">রেভিনিউ চার্ট</h3>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setChartPeriod("weekly")}
              className={`px-3 py-1 text-[10px] font-medium transition-colors ${
                chartPeriod === "weekly" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"
              }`}
            >সাপ্তাহিক</button>
            <button
              onClick={() => setChartPeriod("monthly")}
              className={`px-3 py-1 text-[10px] font-medium transition-colors ${
                chartPeriod === "monthly" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"
              }`}
            >মাসিক</button>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">চার্ট দেখানোর জন্য পর্যাপ্ত ডেটা নেই</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Bar dataKey="রেভিনিউ" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="কমিশন" fill="hsl(var(--destructive, 0 84% 60%))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="নেট_আয়" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Category Pie Chart */}
      {categoryData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">ক্যাটেগরি অনুযায়ী রেভিনিউ</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  formatter={(value: number) => [`৳${value.toLocaleString("bn-BD")}`, "রেভিনিউ"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Filters & Export */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <Filter className="h-3.5 w-3.5" /> ফিল্টার <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <Download className="h-3.5 w-3.5" /> CSV এক্সপোর্ট
        </button>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length}টি লেনদেন</span>
      </div>

      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">শুরুর তারিখ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">শেষ তারিখ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">স্ট্যাটাস</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
              <option value="all">সব</option>
              <option value="paid">পরিশোধিত</option>
              <option value="unpaid">বাকি</option>
              <option value="partial">আংশিক</option>
              <option value="cancelled">বাতিল</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* Transaction List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">কোনো লেনদেন পাওয়া যায়নি</p>
          </div>
        ) : (
          filtered.map((txn, i) => (
            <motion.div key={txn.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      txn.status === "paid" ? "bg-green-500/15 text-green-700 dark:text-green-400" :
                      txn.status === "partial" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" :
                      txn.status === "cancelled" ? "bg-red-500/15 text-red-700 dark:text-red-400" :
                      "bg-orange-500/15 text-orange-700 dark:text-orange-400"
                    }`}>
                      {txn.status === "paid" ? "পরিশোধিত" :
                       txn.status === "partial" ? "আংশিক" :
                       txn.status === "cancelled" ? "বাতিল" : "বাকি"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(txn.date).toLocaleDateString("bn-BD")}
                    </span>
                    {txn.type === "booking" && (
                      <span className="text-[10px] bg-secondary text-muted-foreground rounded px-1.5 py-0.5">বুকিং</span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{txn.customerName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{txn.description}</p>
                  {txn.receiptNumber && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">রশিদ: {txn.receiptNumber}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">৳{txn.amount.toLocaleString("bn-BD")}</p>
                  {txn.commission > 0 && (
                    <p className="text-[10px] text-red-500 flex items-center justify-end gap-0.5">
                      <ArrowDownRight className="h-3 w-3" />-৳{txn.commission.toLocaleString("bn-BD")}
                    </p>
                  )}
                  <p className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                    role === "admin" ? "text-green-600" : "text-primary"
                  }`}>
                    <ArrowUpRight className="h-3 w-3" />৳{txn.netAmount.toLocaleString("bn-BD")}
                  </p>
                </div>
              </div>
              {/* Receipt button */}
              <div className="mt-2 pt-2 border-t border-border/50 flex justify-end">
                <button onClick={() => printReceipt(txn)}
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                  <Printer className="h-3 w-3" /> রশিদ দেখুন
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AccountsSection;
