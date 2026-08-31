import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, TrendingDown, Receipt, Download, Filter,
  Calendar, CreditCard, FileText, ArrowUpRight, ArrowDownRight,
  ChevronDown, Printer, BarChart3, PieChartIcon, Coins, Settings
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from "recharts";
import { getMySqlAuth } from "@/lib/mysqlAuth";

const WALLET_API_BASE_URL = import.meta.env.VITE_CENTRAL_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || ""; 

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

interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'CREDIT' | 'DEBIT';
  currency_type: 'CASH' | 'COIN';
  amount: number;
  module: string;
  reference_id: string | null;
  status: string;
  description: string | null;
  created_at: string;
}

const AccountsSection = ({ userId, role }: AccountsSectionProps) => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_cash: 0,
    total_coins: 0,
    total_deposited: 0,
    total_withdrawn: 0,
    total_wallets: 0,
  });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<"weekly" | "monthly">("weekly");

  // Adjustment Form State
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustType, setAdjustType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjustCurrency, setAdjustCurrency] = useState<"CASH" | "COIN">("CASH");
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustDesc, setAdjustDesc] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const getHeaders = () => {
    const auth = getMySqlAuth();
    return {
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    };
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${WALLET_API_BASE_URL}/api/wallet/admin/stats`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) {
        setStats(json.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${WALLET_API_BASE_URL}/api/wallet/admin/transactions?limit=100`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (typeFilter !== "all") url += `&type=${typeFilter}`;
      
      const res = await fetch(url, { headers: getHeaders() });
      const json = await res.json();
      
      if (json.success) {
        setTransactions(json.data || []);
      } else {
        throw new Error(json.message || "Failed to fetch");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("লেনদেন লোড করতে সমস্যা হয়েছে");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchStats();
    fetchTransactions();
  }, [fetchStats, fetchTransactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  const chartData = useMemo(() => {
    const grouped: Record<string, { credit: number; debit: number }> = {};

    filtered.forEach(t => {
      const d = new Date(t.created_at);
      let key: string;
      if (chartPeriod === "weekly") {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        key = `${startOfWeek.getDate().toString().padStart(2, "0")}/${(startOfWeek.getMonth() + 1).toString().padStart(2, "0")}`;
      } else {
        const months = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
        key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      }
      if (!grouped[key]) grouped[key] = { credit: 0, debit: 0 };
      if (t.type === 'CREDIT') grouped[key].credit += Number(t.amount);
      else grouped[key].debit += Number(t.amount);
    });

    return Object.entries(grouped).map(([name, val]) => ({
      name,
      ইনকাম: Math.round(val.credit),
      ব্যয়: Math.round(val.debit),
    }));
  }, [filtered, chartPeriod]);

  const moduleData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filtered.forEach(t => {
      grouped[t.module] = (grouped[t.module] || 0) + Number(t.amount);
    });
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["তারিখ", "ইউজার", "টাইপ", "মুদ্রা", "পরিমাণ", "মডিউল", "স্ট্যাটাস", "বিবরণ"];
    const rows = filtered.map(t => [
      new Date(t.created_at).toLocaleDateString("bn-BD"),
      t.user_id,
      t.type,
      t.currency_type,
      t.amount,
      t.module,
      t.status,
      t.description || "—",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ফাইল ডাউনলোড হচ্ছে");
  };

  const printReceipt = (txn: WalletTransaction) => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>ট্রানজেকশন রশিদ - ${txn.id.slice(0, 8)}</title>
      <style>body{font-family:sans-serif;padding:20px;font-size:14px}
      .header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
      .total{font-weight:bold;font-size:16px;margin-top:10px;padding-top:10px;border-top:2px solid #000}
      @media print{button{display:none}}</style></head><body>
      <div class="header">
        <h2 style="margin:0">ওয়ালেট ট্রানজেকশন</h2>
        <p style="margin:4px 0;color:#666">${txn.id.slice(0, 8).toUpperCase()}</p>
        <p style="margin:4px 0;color:#666">${new Date(txn.created_at).toLocaleDateString("bn-BD")}</p>
      </div>
      <div class="row"><span>ইউজার:</span><span>${txn.user_id}</span></div>
      <div class="row"><span>মডিউল:</span><span>${txn.module}</span></div>
      <div class="row"><span>টাইপ:</span><span>${txn.type}</span></div>
      <div class="row"><span>মুদ্রা:</span><span>${txn.currency_type}</span></div>
      <div class="row"><span>স্ট্যাটাস:</span><span>${txn.status}</span></div>
      <div class="row total"><span>পরিমাণ:</span><span>${txn.amount} ${txn.currency_type === 'COIN' ? '🪙' : '৳'}</span></div>
      <div style="text-align:center;margin-top:15px">
        <button onclick="window.print()" style="padding:8px 24px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer">প্রিন্ট করুন</button>
      </div>
      </body></html>
    `);
    w.document.close();
  };

  const handleAdminAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId || !adjustAmount) return toast.error("ইউজার এবং পরিমাণ পূরণ করুন");
    setAdjusting(true);
    try {
      const res = await fetch(`${WALLET_API_BASE_URL}/api/wallet/admin/adjust`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          user_id: adjustUserId,
          type: adjustType,
          currency_type: adjustCurrency,
          amount: adjustAmount,
          description: adjustDesc
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("ওয়ালেট সফলভাবে আপডেট হয়েছে!");
        setShowAdjustForm(false);
        setAdjustUserId(""); setAdjustAmount(0); setAdjustDesc("");
        fetchStats();
        fetchTransactions();
      } else {
        throw new Error(json.message);
      }
    } catch (error: any) {
      toast.error(error.message || "আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setAdjusting(false);
    }
  };

  const getSummaryCards = () => {
    return [
      { label: "টোটাল ক্যাশ", value: stats.total_cash, icon: Wallet, color: "text-primary", isCount: false },
      { label: "টোটাল কয়েন", value: stats.total_coins, icon: Coins, color: "text-amber-500", isCount: false },
      { label: "টোটাল ডিপোজিট", value: stats.total_deposited, icon: TrendingUp, color: "text-green-600", isCount: false },
      { label: "টোটাল উইথড্রয়াল", value: stats.total_withdrawn, icon: TrendingDown, color: "text-red-600", isCount: false },
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
                {(card as any).isCount ? card.value : Number(card.value).toLocaleString("bn-BD")}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowAdjustForm(!showAdjustForm)} 
          className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-white hover:bg-destructive/90">
          <Settings className="h-3.5 w-3.5" /> ম্যানুয়াল অ্যাডজাস্ট
        </button>
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <Filter className="h-3.5 w-3.5" /> ফিল্টার <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg bg-userprimary px-3 py-2 text-xs font-medium text-white hover:bg-userprimary">
          <Download className="h-3.5 w-3.5" /> CSV এক্সপোর্ট
        </button>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length}টি লেনদেন</span>
      </div>

      {/* Manual Adjust Form */}
      {showAdjustForm && (
        <motion.form onSubmit={handleAdminAdjust} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">ইউজার আইডি</label>
            <input type="text" value={adjustUserId} onChange={e => setAdjustUserId(e.target.value)} placeholder="UUID"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">টাইপ</label>
            <select value={adjustType} onChange={e => setAdjustType(e.target.value as any)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
              <option value="CREDIT">যোগ করুন (Credit)</option>
              <option value="DEBIT">কেটে নিন (Debit)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">মুদ্রা</label>
            <select value={adjustCurrency} onChange={e => setAdjustCurrency(e.target.value as any)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
              <option value="CASH">ক্যাশ</option>
              <option value="COIN">কয়েন</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">পরিমাণ</label>
            <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">বিবরণ</label>
            <input type="text" value={adjustDesc} onChange={e => setAdjustDesc(e.target.value)} placeholder="যেমন: Refund for booking #123"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
          </div>
          <button type="submit" disabled={adjusting} className="sm:col-span-2 lg:col-span-3 rounded-lg bg-destructive py-2 text-xs font-semibold text-white hover:bg-destructive/90 disabled:opacity-50">
            {adjusting ? "আপডেট হচ্ছে..." : "ওয়ালেট আপডেট করুন"}
          </button>
        </motion.form>
      )}

      {/* Filters & Export */}
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
              <option value="COMPLETED">সম্পন্ন</option>
              <option value="PENDING">অপেক্ষমান</option>
              <option value="FAILED">ব্যর্থ</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">টাইপ</label>
            <div className="flex gap-2">
              <button onClick={() => setTypeFilter("all")} className={`px-3 py-1 text-[10px] rounded-md ${typeFilter === "all" ? "bg-primary text-white" : "bg-secondary"}`}>সব</button>
              <button onClick={() => setTypeFilter("CREDIT")} className={`px-3 py-1 text-[10px] rounded-md ${typeFilter === "CREDIT" ? "bg-primary text-white" : "bg-secondary"}`}>ইনকাম (Credit)</button>
              <button onClick={() => setTypeFilter("DEBIT")} className={`px-3 py-1 text-[10px] rounded-md ${typeFilter === "DEBIT" ? "bg-primary text-white" : "bg-secondary"}`}>ব্যয় (Debit)</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">ওয়ালেট ফ্লো চার্ট</h3>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setChartPeriod("weekly")} className={`px-3 py-1 text-[10px] font-medium transition-colors ${chartPeriod === "weekly" ? "bg-userprimary text-white" : "bg-background text-muted-foreground hover:bg-secondary"}`}>সাপ্তাহিক</button>
            <button onClick={() => setChartPeriod("monthly")} className={`px-3 py-1 text-[10px] font-medium transition-colors ${chartPeriod === "monthly" ? "bg-userprimary text-white" : "bg-background text-muted-foreground hover:bg-secondary"}`}>মাসিক</button>
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
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Bar dataKey="ইনকাম" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ব্যয়" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Module Pie Chart */}
      {moduleData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">মডিউল অনুযায়ী লেনদেন</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={moduleData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                  {moduleData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
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
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${txn.type === "CREDIT" ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-red-500/15 text-red-700 dark:text-red-400"}`}>
                      {txn.type === "CREDIT" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {txn.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">{txn.module}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(txn.created_at).toLocaleDateString("bn-BD")}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">ইউজার: {txn.user_id}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{txn.description || "No description"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${txn.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                    {txn.type === "CREDIT" ? "+" : "-"}{Number(txn.amount).toLocaleString("bn-BD")} {txn.currency_type === "COIN" ? "🪙" : "৳"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{txn.status}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border/50 flex justify-end">
                <button onClick={() => printReceipt(txn)} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
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
