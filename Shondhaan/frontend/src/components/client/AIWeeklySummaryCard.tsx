import { useEffect, useMemo, useState } from "react";
import { Sparkles, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Stats {
  total: number;
  completed: number;
  pending: number;
  spent: number;
  topService?: string;
}

/**
 * AI-style weekly summary card for client dashboard — totals, top service,
 * and a friendly natural-language insight. Computes locally; no AI call.
 */
export default function AIWeeklySummaryCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("bookings")
        .select("status, package_price, service_title")
        .eq("user_id", user.id)
        .gte("created_at", since);
      if (!alive) return;

      const list = data || [];
      const counts: Record<string, number> = {};
      let spent = 0;
      let completed = 0;
      let pending = 0;
      list.forEach((b) => {
        spent += Number(b.package_price || 0);
        if (b.status === "completed") completed += 1;
        else if (["pending", "confirmed", "in_progress"].includes(b.status)) pending += 1;
        counts[b.service_title] = (counts[b.service_title] || 0) + 1;
      });
      const topService = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      setStats({ total: list.length, completed, pending, spent, topService });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const insight = useMemo(() => {
    if (!stats) return "";
    const bn = (localStorage.getItem("yess_lang") || "bn") === "bn";
    if (stats.total === 0)
      return bn
        ? "এই সপ্তাহে কোনো বুকিং নেই — কী সার্ভিস প্রয়োজন?"
        : "No bookings this week — what service do you need?";
    if (stats.completed === stats.total)
      return bn
        ? `চমৎকার! সব ${stats.completed}টি সার্ভিস সম্পন্ন হয়েছে ✨`
        : `Awesome! All ${stats.completed} services completed ✨`;
    if (stats.pending > 0)
      return bn
        ? `${stats.pending}টি সার্ভিস চলমান, ${stats.completed}টি সম্পন্ন।`
        : `${stats.pending} in progress, ${stats.completed} completed.`;
    return bn ? "সপ্তাহের সারাংশ প্রস্তুত।" : "Your weekly summary is ready.";
  }, [stats]);

  if (!user) return null;
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }
  if (!stats) return null;

  const bn = (localStorage.getItem("yess_lang") || "bn") === "bn";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-semibold text-foreground">
            {bn ? "এ সপ্তাহের সারাংশ" : "Your week at a glance"}
          </h3>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">{insight}</p>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label={bn ? "মোট" : "Total"} value={stats.total} />
          <Stat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label={bn ? "সম্পন্ন" : "Done"} value={stats.completed} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label={bn ? "চলমান" : "Active"} value={stats.pending} />
        </div>
        {stats.topService && (
          <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{bn ? "শীর্ষ সার্ভিস: " : "Top service: "}</span>
            {stats.topService}
          </p>
        )}
        {stats.spent > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{bn ? "ব্যয়: " : "Spent: "}</span>
            ৳{stats.spent.toLocaleString("bn-BD")}
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-background/60 p-2 text-center backdrop-blur">
      <div className="mb-0.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
