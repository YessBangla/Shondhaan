import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, RefreshCw, Wallet, TrendingUp, TrendingDown,
  Receipt, Download, DollarSign, PieChart, Banknote, MessageSquare, Calendar, X, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import AccountsSection from "@/components/AccountsSection";
import { printLetterhead, letterheadPage, letterheadHeader } from "@/lib/letterheadPrint";
import { useFormat } from "@/hooks/useFormat";
import { formatCurrency, formatDate, formatNumber, localizeDigits } from "@/lib/i18nFormat";
import { useLanguage } from "@/contexts/LanguageContext";

interface Earning {
  id: string;
  rep_id: string;
  total_amount: number;
  commission_amount: number;
  rep_earning: number;
  receipt_number: string;
  created_at: string;
  status: string;
}

interface WithdrawalReq {
  id: string;
  rep_id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  account_number: string;
}

const PIE_COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const FinancePanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fmt = useFormat();
  const { language } = useLanguage();
  const [isFinance, setIsFinance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalReq[]>([]);
  const [repMap, setRepMap] = useState<Record<string, string>>({});
  const [preset, setPreset] = useState<"7d" | "30d" | "90d" | "1y" | "all" | "custom">("30d");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login");
  }, [user, authLoading, navigate]);

  const checkRole = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roles = data?.map(r => r.role) || [];
    if (!roles.includes("finance") && !roles.includes("admin")) {
      toast.error(language === "bn" ? "ফিনান্স অ্যাক্সেস নেই" : "No finance access");
      navigate("/");
      return;
    }
    setIsFinance(true);
  }, [user, navigate, language]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [earningsRes, withdrawalsRes, repsRes] = await Promise.all([
      (supabase as any).from("rep_earnings").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("withdrawal_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("area_representatives").select("user_id, name"),
    ]);
    if (earningsRes.data) setEarnings(earningsRes.data);
    if (withdrawalsRes.data) setWithdrawals(withdrawalsRes.data);
    if (repsRes.data) {
      const map: Record<string, string> = {};
      repsRes.data.forEach((r: any) => { map[r.user_id] = r.name; });
      setRepMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkRole(); }, [checkRole]);
  useEffect(() => { if (isFinance) fetchData(); }, [isFinance, fetchData]);

  const t = useMemo(() => ({
    // chart keys
    revenue: language === "bn" ? "রেভিনিউ" : "Revenue",
    commission: language === "bn" ? "কমিশন" : "Commission",
    // payment methods
    bkash: language === "bn" ? "বিকাশ" : "bKash",
    nagad: language === "bn" ? "নগদ" : "Nagad",
    rocket: language === "bn" ? "রকেট" : "Rocket",
    bank: language === "bn" ? "ব্যাংক" : "Bank",
    // chart titles
    monthlyTitle: language === "bn" ? "মাসিক রেভিনিউ ও কমিশন" : "Monthly Revenue & Commission",
    methodTitle: language === "bn" ? "উইথড্রয়াল মাধ্যম" : "Withdrawal Methods",
    noData: language === "bn" ? "ডেটা নেই" : "No data",
    // page chrome
    panelTitle: language === "bn" ? "ফিনান্স প্যানেল" : "Finance Panel",
    panelShort: language === "bn" ? "ফিনান্স" : "Finance",
    heroTitle: language === "bn" ? "ফিনান্স কন্ট্রোল রুম" : "Finance Control Room",
    heroSubtitle: language === "bn"
      ? "পেমেন্ট, কমিশন, উইথড্রয়াল ও লেজার — পুরো অর্থপ্রবাহ এক নজরে।"
      : "Payments, commissions, withdrawals & ledger — full money flow at a glance.",
    heroBadge: language === "bn" ? "ফিনান্স প্যানেল" : "Finance Panel",
    back: language === "bn" ? "পেছনে যান" : "Back",
    chatHub: language === "bn" ? "চ্যাট হাব" : "Chat Hub",
    refresh: language === "bn" ? "রিফ্রেশ" : "Refresh",
    transactions: language === "bn" ? "লেনদেন" : "Transactions",
    withdrawals: language === "bn" ? "উইথড্রয়াল" : "Withdrawals",
    // tabs
    tabOverview: language === "bn" ? "ওভারভিউ" : "Overview",
    tabEarnings: language === "bn" ? "লেনদেন হিস্ট্রি" : "Transaction History",
    tabWithdrawals: language === "bn" ? "উইথড্রয়াল" : "Withdrawals",
    tabAccounts: language === "bn" ? "একাউন্টস" : "Accounts",
    groupDashboard: language === "bn" ? "ড্যাশবোর্ড" : "Dashboard",
    groupTransactions: language === "bn" ? "লেনদেন" : "Transactions",
    groupReports: language === "bn" ? "রিপোর্ট" : "Reports",
    // summary cards
    sumRevenue: language === "bn" ? "মোট রেভিনিউ" : "Total Revenue",
    sumCommission: language === "bn" ? "মোট কমিশন" : "Total Commission",
    sumRepEarning: language === "bn" ? "প্রতিনিধি আয়" : "Rep Earnings",
    sumWithdrawn: language === "bn" ? "মোট উইথড্রন" : "Total Withdrawn",
    sumPending: language === "bn" ? "অপেক্ষমাণ উইথড্রয়াল" : "Pending Withdrawals",
    // empty states & access
    noEarnings: language === "bn" ? "কোনো লেনদেন নেই" : "No transactions",
    noWithdrawals: language === "bn" ? "কোনো উইথড্রয়াল নেই" : "No withdrawals",
    noAccess: language === "bn" ? "অ্যাক্সেস নেই" : "No access",
    noAccessDesc: language === "bn" ? "এই পেজটি শুধুমাত্র ফিনান্স টিমের জন্য।" : "This page is for the finance team only.",
    backHome: language === "bn" ? "হোমে ফিরুন" : "Back to home",
    // toasts
    csvToast: language === "bn" ? "CSV ডাউনলোড হয়েছে" : "CSV downloaded",
    // list labels
    lblCommission: language === "bn" ? "কমিশন" : "Commission",
    lblRepEarning: language === "bn" ? "প্রতিনিধি আয়" : "Rep earning",
    lblRep: language === "bn" ? "প্রতিনিধি" : "Rep",
    // date filter
    dateRange: language === "bn" ? "তারিখ ফিল্টার" : "Date Range",
    now: language === "bn" ? "এখন" : "Now",
    fromDateAria: language === "bn" ? "শুরুর তারিখ" : "From date",
    toDateAria: language === "bn" ? "শেষের তারিখ" : "To date",
    // statuses
    statusPending: language === "bn" ? "অপেক্ষমাণ" : "Pending",
    statusApproved: language === "bn" ? "অনুমোদিত" : "Approved",
    statusCompleted: language === "bn" ? "সম্পন্ন" : "Completed",
    statusRejected: language === "bn" ? "প্রত্যাখ্যাত" : "Rejected",
    // CSV headers
    csvReceipt: language === "bn" ? "রশিদ" : "Receipt",
    csvAmount: language === "bn" ? "পরিমাণ" : "Amount",
    csvCommission: language === "bn" ? "কমিশন" : "Commission",
    csvRepEarning: language === "bn" ? "প্রতিনিধি আয়" : "Rep Earning",
    csvDate: language === "bn" ? "তারিখ" : "Date",
    // presets
    p7d: language === "bn" ? "৭ দিন" : "7 days",
    p30d: language === "bn" ? "৩০ দিন" : "30 days",
    p90d: language === "bn" ? "৯০ দিন" : "90 days",
    p1y: language === "bn" ? "১ বছর" : "1 year",
    pAll: language === "bn" ? "সব" : "All",
  }), [language]);

  // Compute active date range from preset/custom
  const range = useMemo(() => {
    if (preset === "custom") {
      const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
      const to = toDate ? new Date(toDate + "T23:59:59") : null;
      return { from, to };
    }
    if (preset === "all") return { from: null as Date | null, to: null as Date | null };
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "90d" ? 90 : 365;
    return { from: new Date(Date.now() - days * 86400000), to: null };
  }, [preset, fromDate, toDate]);

  const inRange = useCallback((iso: string) => {
    const ts = new Date(iso).getTime();
    if (range.from && ts < range.from.getTime()) return false;
    if (range.to && ts > range.to.getTime()) return false;
    return true;
  }, [range]);

  const filteredEarnings = useMemo(() => earnings.filter(e => inRange(e.created_at)), [earnings, inRange]);
  const filteredWithdrawals = useMemo(() => withdrawals.filter(w => inRange(w.created_at)), [withdrawals, inRange]);

  const summary = useMemo(() => {
    const totalRevenue = filteredEarnings.reduce((s, e) => s + e.total_amount, 0);
    const totalCommission = filteredEarnings.reduce((s, e) => s + e.commission_amount, 0);
    const totalRepEarning = filteredEarnings.reduce((s, e) => s + e.rep_earning, 0);
    const totalWithdrawn = filteredWithdrawals.filter(w => w.status === "completed").reduce((s, w) => s + w.amount, 0);
    const pendingWithdrawals = filteredWithdrawals.filter(w => w.status === "pending").reduce((s, w) => s + w.amount, 0);
    return { totalRevenue, totalCommission, totalRepEarning, totalWithdrawn, pendingWithdrawals };
  }, [filteredEarnings, filteredWithdrawals]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const grouped: Record<string, { revenue: number; commission: number }> = {};
    filteredEarnings.forEach(e => {
      const month = fmt.date(e.created_at, { year: "numeric", month: "short" });
      if (!grouped[month]) grouped[month] = { revenue: 0, commission: 0 };
      grouped[month].revenue += e.total_amount;
      grouped[month].commission += e.commission_amount;
    });
    return Object.entries(grouped).slice(-6).map(([name, vals]) => ({
      name, [t.revenue]: vals.revenue, [t.commission]: vals.commission,
    }));
  }, [filteredEarnings, fmt, t]);

  // Method breakdown for pie
  const methodBreakdown = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredWithdrawals.filter(w => w.status === "completed").forEach(w => {
      const label = w.method === "bkash" ? t.bkash : w.method === "nagad" ? t.nagad : w.method === "rocket" ? t.rocket : t.bank;
      grouped[label] = (grouped[label] || 0) + w.amount;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [filteredWithdrawals, t]);

  const exportCSV = () => {
    const headers = [t.csvReceipt, t.csvAmount, t.csvCommission, t.csvRepEarning, t.csvDate];
    const rows = filteredEarnings.map(e => [
      e.receipt_number, e.total_amount, e.commission_amount, e.rep_earning,
      formatDate(e.created_at, language),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `finance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success(t.csvToast);
  };

  const exportPDF = () => {
    const fmtMoney = (n: number) => `৳${(n || 0).toLocaleString(language === "bn" ? "bn-BD" : "en-US")}`;
    const summaryRows = `
      <table class="lh-table">
        <tbody>
          <tr><td>${t.sumRevenue}</td><td style="text-align:end;font-weight:700;">${fmtMoney(summary.totalRevenue)}</td></tr>
          <tr><td>${t.sumCommission}</td><td style="text-align:end;font-weight:700;">${fmtMoney(summary.totalCommission)}</td></tr>
          <tr><td>${t.sumRepEarning}</td><td style="text-align:end;font-weight:700;">${fmtMoney(summary.totalRepEarning)}</td></tr>
          <tr><td>${t.sumWithdrawn}</td><td style="text-align:end;font-weight:700;">${fmtMoney(summary.totalWithdrawn)}</td></tr>
          <tr class="lh-total"><td>${t.sumPending}</td><td style="text-align:end;">${fmtMoney(summary.pendingWithdrawals)}</td></tr>
        </tbody>
      </table>`;
    const earningsTable = `
      <table class="lh-table">
        <thead><tr>
          <th>#</th><th>${t.csvReceipt}</th><th style="text-align:end;">${t.csvAmount}</th>
          <th style="text-align:end;">${t.csvCommission}</th><th style="text-align:end;">${t.csvRepEarning}</th>
          <th>${t.csvDate}</th>
        </tr></thead>
        <tbody>
          ${filteredEarnings.slice(0, 40).map((e, i) => `
            <tr><td>${i + 1}</td><td>${e.receipt_number}</td>
              <td style="text-align:end;">${fmtMoney(e.total_amount)}</td>
              <td style="text-align:end;">${fmtMoney(e.commission_amount)}</td>
              <td style="text-align:end;">${fmtMoney(e.rep_earning)}</td>
              <td>${formatDate(e.created_at, language)}</td></tr>`).join("")}
        </tbody>
      </table>
      ${filteredEarnings.length > 40 ? `<p style="font-size:9pt;color:#64748b;margin-top:3mm;">+${filteredEarnings.length - 40} ${language === "bn" ? "আরও সারি" : "more rows"}</p>` : ""}`;
    const rangeLabel = `${range.from ? formatDate(range.from.toISOString(), language) : ""}${range.to ? ` — ${formatDate(range.to.toISOString(), language)}` : ` — ${t.now}`}`;
    const inner = `
      ${letterheadHeader({ title: t.panelTitle, subtitle: rangeLabel,
        left: `${t.transactions}: ${filteredEarnings.length}`,
        right: `${t.withdrawals}: ${filteredWithdrawals.length}` })}
      <div class="lh-section"><div class="lh-section-title">${language === "bn" ? "সারাংশ" : "Summary"}</div>${summaryRows}</div>
      <div class="lh-section"><div class="lh-section-title">${t.tabEarnings}</div>
        ${filteredEarnings.length ? earningsTable : `<p style="color:#94a3b8;font-size:10pt;">${t.noEarnings}</p>`}
      </div>`;
    const ok = printLetterhead({
      title: `${t.panelTitle} — ${new Date().toISOString().slice(0, 10)}`,
      bodyHtml: letterheadPage(inner),
      language,
    });
    if (!ok) toast.error(language === "bn" ? "পপ-আপ ব্লক করা আছে" : "Pop-up blocked");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isFinance) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="font-heading text-xl font-bold text-foreground mb-2">{t.noAccess}</h1>
          <p className="text-muted-foreground text-sm mb-4">{t.noAccessDesc}</p>
          <button onClick={() => navigate("/")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">{t.backHome}</button>
        </div>
        <div className="h-16 md:hidden" />
      </div>
    );
  }

  const presetLabels: Record<string, string> = {
    "7d": t.p7d, "30d": t.p30d, "90d": t.p90d, "1y": t.p1y, "all": t.pAll,
  };

  return (
    <div className="min-h-screen bg-background">
      
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> {t.back}
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" /> {t.panelTitle}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.transactions}: {fmt.number(filteredEarnings.length)} • {t.withdrawals}: {fmt.number(filteredWithdrawals.length)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => navigate("/internal")}>
              <MessageSquare className="h-3.5 w-3.5" /> {t.chatHub}
            </Button>
            <NotificationBell />
            <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20">
              <FileText className="h-3.5 w-3.5" /> PDF
            </button>
            <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
              <RefreshCw className="h-3.5 w-3.5" /> {t.refresh}
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mb-4 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              {t.dateRange}
              {range.from && (
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({fmt.date(range.from)}{range.to ? ` — ${fmt.date(range.to)}` : ` — ${t.now}`})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["7d", "30d", "90d", "1y", "all"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => { setPreset(p); setFromDate(""); setToDate(""); }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    preset === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {presetLabels[p]}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setPreset("custom"); }}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                  aria-label={t.fromDateAria}
                />
                <span className="text-[11px] text-muted-foreground">—</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setPreset("custom"); }}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                  aria-label={t.toDateAria}
                />
                {preset === "custom" && (fromDate || toDate) && (
                  <button
                    onClick={() => { setFromDate(""); setToDate(""); setPreset("30d"); }}
                    className="ml-0.5 p-1 rounded-md hover:bg-secondary"
                    aria-label="Clear"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="rounded-xl border border-border bg-card p-3">
            <TrendingUp className="h-4 w-4 text-primary mb-1" />
            <p className="text-xl font-bold text-foreground">{fmt.currency(summary.totalRevenue)}</p>
            <p className="text-[10px] text-muted-foreground">{t.sumRevenue}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <Receipt className="h-4 w-4 text-green-600 mb-1" />
            <p className="text-xl font-bold text-green-600">{fmt.currency(summary.totalCommission)}</p>
            <p className="text-[10px] text-muted-foreground">{t.sumCommission}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <Banknote className="h-4 w-4 text-blue-600 mb-1" />
            <p className="text-xl font-bold text-blue-600">{fmt.currency(summary.totalRepEarning)}</p>
            <p className="text-[10px] text-muted-foreground">{t.sumRepEarning}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <TrendingDown className="h-4 w-4 text-orange-600 mb-1" />
            <p className="text-xl font-bold text-orange-600">{fmt.currency(summary.totalWithdrawn)}</p>
            <p className="text-[10px] text-muted-foreground">{t.sumWithdrawn}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <Wallet className="h-4 w-4 text-yellow-600 mb-1" />
            <p className="text-xl font-bold text-yellow-600">{fmt.currency(summary.pendingWithdrawals)}</p>
            <p className="text-[10px] text-muted-foreground">{t.sumPending}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <PanelSidebarTabs
            items={[
              { value: "overview", label: t.tabOverview, icon: <PieChart className="h-4 w-4" />, group: t.groupDashboard },
              { value: "earnings", label: t.tabEarnings, icon: <Receipt className="h-4 w-4" />, group: t.groupTransactions },
              { value: "withdrawals", label: t.tabWithdrawals, icon: <Banknote className="h-4 w-4" /> },
              { value: "accounts", label: t.tabAccounts, icon: <Wallet className="h-4 w-4" />, group: t.groupReports },
            ]}
            defaultValue="overview"
            panelTitle={t.panelShort}
            panelIcon={<DollarSign className="h-4 w-4" />}
            hero={{
              title: t.heroTitle,
              subtitle: t.heroSubtitle,
              badge: { label: t.heroBadge },
              gradient: "from-amber-500 via-yellow-600 to-orange-600",
            }}
          >
            {(activeTab) => {
              if (activeTab === "overview") return (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-bold text-foreground mb-3">{t.monthlyTitle}</h3>
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthlyData}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatNumber(v, language)} />
                          <Tooltip
                            formatter={(v: number) => formatCurrency(v, language)}
                            labelFormatter={(label: string) => label}
                          />
                          <Bar dataKey={t.revenue} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey={t.commission} fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="py-10 text-center text-xs text-muted-foreground">{t.noData}</div>}
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-bold text-foreground mb-3">{t.methodTitle}</h3>
                    {methodBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <RePieChart>
                          <Pie data={methodBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} label={({ name, percent }) => `${name} ${localizeDigits((percent * 100).toFixed(0), language)}%`}>
                            {methodBreakdown.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v, language)} />
                        </RePieChart>
                      </ResponsiveContainer>
                    ) : <div className="py-10 text-center text-xs text-muted-foreground">{t.noData}</div>}
                  </div>
                </div>
              );
              if (activeTab === "earnings") return (
                <div className="p-4 space-y-2">
                  {filteredEarnings.length === 0 ? <div className="py-12 text-center text-muted-foreground">{t.noEarnings}</div> : filteredEarnings.map((e, i) => (
                    <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /><span className="text-xs font-mono font-semibold text-foreground">{e.receipt_number}</span></div>
                        <span className="text-xs font-bold text-foreground">{fmt.currency(e.total_amount)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                        <span>{t.lblCommission}: {fmt.currency(e.commission_amount)}</span>
                        <span>{t.lblRepEarning}: {fmt.currency(e.rep_earning)}</span>
                        <span>{t.lblRep}: {repMap[e.rep_id] || e.rep_id.slice(0, 8)}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground/60 mt-1">{fmt.date(e.created_at)}</p>
                    </motion.div>
                  ))}
                </div>
              );
              if (activeTab === "withdrawals") return (
                <div className="p-4 space-y-2">
                  {filteredWithdrawals.length === 0 ? <div className="py-12 text-center text-muted-foreground">{t.noWithdrawals}</div> : filteredWithdrawals.map((w, i) => {
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      pending: { label: t.statusPending, cls: "bg-yellow-100 text-yellow-800" },
                      approved: { label: t.statusApproved, cls: "bg-green-100 text-green-800" },
                      completed: { label: t.statusCompleted, cls: "bg-blue-100 text-blue-800" },
                      rejected: { label: t.statusRejected, cls: "bg-red-100 text-red-800" },
                    };
                    const s = statusMap[w.status] || statusMap.pending;
                    const methodLabel = w.method === "bkash" ? t.bkash : w.method === "nagad" ? t.nagad : w.method === "rocket" ? t.rocket : w.method === "bank" ? t.bank : w.method;
                    return (
                      <motion.div key={w.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <div><p className="text-sm font-bold text-foreground">{fmt.currency(w.amount)}</p><p className="text-[10px] text-muted-foreground">{repMap[w.rep_id] || w.rep_id.slice(0, 8)} • {methodLabel} • {w.account_number}</p></div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground/60 mt-1">{fmt.date(w.created_at)}</p>
                      </motion.div>
                    );
                  })}
                </div>
              );
              if (activeTab === "accounts") return <div className="p-4">{user && <AccountsSection userId={user.id} role="admin" />}</div>;
              return null;
            }}
          </PanelSidebarTabs>
        </div>
      </div>

      
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default FinancePanel;
