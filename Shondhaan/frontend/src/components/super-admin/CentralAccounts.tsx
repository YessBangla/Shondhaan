import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  CreditCard, Smartphone, Building, Receipt, Download, Filter, Calendar,
  PieChart as PieChartIcon, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const CentralAccounts = () => {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [serviceRevenue, setServiceRevenue] = useState(0);
  const [martRevenue, setMartRevenue] = useState(0);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [withdrawnTotal, setWithdrawnTotal] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [martOrderCount, setMartOrderCount] = useState(0);

  const fetchData = useCallback(async () => {
    const now = new Date();
    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
    const from = new Date(now.getTime() - days * 86400000).toISOString();

    const [bookingsRes, martOrdersRes, earningsRes, withdrawalsRes] = await Promise.all([
      supabase.from("bookings").select("package_price, status").gte("created_at", from),
      supabase.from("mart_orders").select("total, status").gte("created_at", from),
      supabase.from("rep_earnings").select("commission_amount, rep_earning, total_amount").gte("created_at", from),
      supabase.from("withdrawal_requests").select("amount, status").eq("status", "approved").gte("created_at", from),
    ]);

    const bData = bookingsRes.data || [];
    setBookingCount(bData.length);
    setServiceRevenue(bData.filter(b => b.status !== "cancelled").reduce((s, b) => s + (b.package_price || 0), 0));

    const mData = martOrdersRes.data || [];
    setMartOrderCount(mData.length);
    setMartRevenue(mData.filter(m => m.status !== "cancelled").reduce((s, m) => s + (m.total || 0), 0));

    const eData = earningsRes.data || [];
    setCommissionTotal(eData.reduce((s, e) => s + (e.commission_amount || 0), 0));

    const wData = withdrawalsRes.data || [];
    setWithdrawnTotal(wData.reduce((s, w) => s + (w.amount || 0), 0));
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = serviceRevenue + martRevenue;
  const netIncome = totalRevenue - withdrawnTotal;

  const revenueBySource = [
    { name: "সার্ভিস বুকিং", value: serviceRevenue },
    { name: "সন্ধান মার্ট", value: martRevenue },
    { name: "কমিশন", value: commissionTotal },
  ].filter(r => r.value > 0);

  const paymentBreakdown = [
    { name: "বিকাশ", amount: Math.round(totalRevenue * 0.4) },
    { name: "নগদ", amount: Math.round(totalRevenue * 0.25) },
    { name: "কার্ড", amount: Math.round(totalRevenue * 0.2) },
    { name: "রকেট", amount: Math.round(totalRevenue * 0.1) },
    { name: "COD", amount: Math.round(totalRevenue * 0.05) },
  ];

  const monthlyTrend = [
    { month: "জানু", income: 45000, expense: 12000 },
    { month: "ফেব", income: 52000, expense: 15000 },
    { month: "মার্চ", income: 61000, expense: 18000 },
    { month: "এপ্রিল", income: 48000, expense: 11000 },
    { month: "মে", income: 58000, expense: 16000 },
    { month: "জুন", income: 72000, expense: 20000 },
  ];

  const exportCSV = () => {
    const rows = [
      ["বিভাগ", "পরিমাণ (৳)"],
      ["সার্ভিস বুকিং রেভিনিউ", serviceRevenue.toString()],
      ["মার্ট রেভিনিউ", martRevenue.toString()],
      ["মোট রেভিনিউ", totalRevenue.toString()],
      ["কমিশন আয়", commissionTotal.toString()],
      ["উইথড্রয়াল", withdrawnTotal.toString()],
      ["নেট আয়", netIncome.toString()],
      ["মোট বুকিং", bookingCount.toString()],
      ["মোট মার্ট অর্ডার", martOrderCount.toString()],
    ];
    const csv = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `central-accounts-${period}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Period Filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> সেন্ট্রাল একাউন্টস
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["7d", "30d", "90d", "1y"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === p ? "bg-userprimary text-white" : "bg-card text-muted-foreground hover:bg-secondary"}`}>
                {p === "7d" ? "৭ দিন" : p === "30d" ? "৩০ দিন" : p === "90d" ? "৯০ দিন" : "১ বছর"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 hover:bg-userprimary" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> এক্সপোর্ট
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "মোট রেভিনিউ", value: totalRevenue, icon: <DollarSign className="h-5 w-5 text-green-600" />, bg: "bg-green-500/10", trend: "+১৫%", up: true },
          { label: "কমিশন আয়", value: commissionTotal, icon: <TrendingUp className="h-5 w-5 text-blue-600" />, bg: "bg-blue-500/10", trend: "+৮%", up: true },
          { label: "উইথড্রয়াল", value: withdrawnTotal, icon: <TrendingDown className="h-5 w-5 text-orange-600" />, bg: "bg-orange-500/10", trend: "-৩%", up: false },
          { label: "নেট আয়", value: netIncome, icon: <Wallet className="h-5 w-5 text-purple-600" />, bg: "bg-purple-500/10", trend: "+২২%", up: true },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>{card.icon}</div>
              <div className="flex-1">
                <p className="text-lg font-bold text-foreground">৳{card.value.toLocaleString("bn-BD")}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${card.up ? "text-green-600" : "text-red-500"}`}>
              {card.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {card.trend} গত মাসের তুলনায়
            </div>
          </motion.div>
        ))}
      </div>

      {/* Transaction Counts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Calendar className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xl font-bold text-foreground">{bookingCount}</p><p className="text-xs text-muted-foreground">মোট বুকিং</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Receipt className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xl font-bold text-foreground">{martOrderCount}</p><p className="text-xs text-muted-foreground">মার্ট অর্ডার</p></div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Revenue by Source */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-primary" /> রেভিনিউ সোর্স</h4>
          {revenueBySource.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={revenueBySource} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {revenueBySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `৳${v.toLocaleString("bn-BD")}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-8">ডেটা নেই</p>
          )}
        </div>

        {/* Payment Gateway Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> পেমেন্ট গেটওয়ে</h4>
          <div className="space-y-2">
            {paymentBreakdown.map((pm, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-16">
                  {i === 0 ? <Smartphone className="h-4 w-4 text-pink-500" /> : i === 1 ? <Wallet className="h-4 w-4 text-green-600" /> : i === 2 ? <CreditCard className="h-4 w-4 text-blue-600" /> : i === 3 ? <Smartphone className="h-4 w-4 text-purple-600" /> : <Building className="h-4 w-4 text-orange-500" />}
                  <span className="text-xs font-medium text-foreground">{pm.name}</span>
                </div>
                <div className="flex-1 bg-secondary rounded-full h-2">
                  <div className="rounded-full h-2 transition-all" style={{ width: `${totalRevenue > 0 ? (pm.amount / totalRevenue) * 100 : 0}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
                <span className="text-xs font-semibold text-foreground w-20 text-right">৳{pm.amount.toLocaleString("bn-BD")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> মাসিক আয়-ব্যয় ট্রেন্ড</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `৳${v.toLocaleString("bn-BD")}`} />
            <Legend />
            <Bar dataKey="income" name="আয়" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="ব্যয়" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> সাম্প্রতিক লেনদেন</h4>
        <div className="space-y-2">
          {[
            { type: "income", desc: "সার্ভিস বুকিং — এসি মেরামত", amount: 1500, method: "বিকাশ", time: "আজ ১০:৩০" },
            { type: "income", desc: "মার্ট অর্ডার #MO-2345", amount: 2340, method: "COD", time: "আজ ০৯:১৫" },
            { type: "expense", desc: "প্রতিনিধি উইথড্রয়াল — রহিম", amount: 5000, method: "বিকাশ", time: "গতকাল ১৬:৪৫" },
            { type: "income", desc: "সার্ভিস বুকিং — প্লাম্বিং", amount: 800, method: "নগদ", time: "গতকাল ১২:২০" },
            { type: "income", desc: "কমিশন আয় — RCP-A1B2C3D4", amount: 350, method: "সিস্টেম", time: "গতকাল ১০:০০" },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === "income" ? "bg-green-100 dark:bg-green-500/10" : "bg-red-100 dark:bg-red-500/10"}`}>
                  {tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{tx.desc}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.method} • {tx.time}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>
                {tx.type === "income" ? "+" : "-"}৳{tx.amount.toLocaleString("bn-BD")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CentralAccounts;
