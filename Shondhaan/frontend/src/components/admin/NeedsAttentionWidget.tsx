import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ClipboardCheck, MessageSquareWarning, CalendarClock,
  PackageX, ChevronRight, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { loadNotificationRules } from "@/pages/admin/AdminNotificationRules";

const toBn = (n: number | string) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

interface AttentionItem {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  tone: "amber" | "red" | "blue" | "purple" | "emerald";
  href: string;
  hint?: string;
}

const toneStyles: Record<AttentionItem["tone"], { ring: string; bg: string; text: string; chip: string }> = {
  amber:   { ring: "ring-amber-500/25",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",   chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  red:     { ring: "ring-red-500/25",     bg: "bg-red-500/10",     text: "text-red-700 dark:text-red-400",       chip: "bg-red-500/15 text-red-700 dark:text-red-400" },
  blue:    { ring: "ring-blue-500/25",    bg: "bg-blue-500/10",    text: "text-blue-700 dark:text-blue-400",     chip: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  purple:  { ring: "ring-purple-500/25",  bg: "bg-purple-500/10",  text: "text-purple-700 dark:text-purple-400", chip: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  emerald: { ring: "ring-emerald-500/25", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
};

/**
 * "Needs your attention" widget — single glance to all pending action items.
 * Counts are loaded in parallel; clicking a card jumps to the relevant tab.
 */
const NeedsAttentionWidget = ({ basePath = "/super-admin" }: { basePath?: string }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesVersion, setRulesVersion] = useState(0);

  useEffect(() => {
    const handler = () => setRulesVersion((v) => v + 1);
    window.addEventListener("yess:notification-rules-changed", handler);
    return () => window.removeEventListener("yess:notification-rules-changed", handler);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rules = loadNotificationRules();
        const [approvals, disputes, pendingBookings, lowStock, openRequests] = await Promise.all([
          supabase.from("approval_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress", "escalated"]),
          supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("mart_products").select("id", { count: "exact", head: true }).lte("stock", rules.low_stock_threshold),
          supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);

        if (!alive) return;

        const next: AttentionItem[] = [];
        if (rules.enabled_pending_approvals) next.push(
          {
            key: "approvals",
            label: "পেন্ডিং অ্যাপ্রুভাল",
            count: approvals.count || 0,
            icon: <ClipboardCheck className="h-4 w-4" />,
            tone: "amber",
            href: `${basePath}?tab=approvals`,
            hint: "রিভিউ অপেক্ষমাণ",
          });
        if (rules.enabled_overdue_disputes) next.push(
          {
            key: "disputes",
            label: "খোলা অভিযোগ",
            count: disputes.count || 0,
            icon: <MessageSquareWarning className="h-4 w-4" />,
            tone: "red",
            href: `${basePath}?tab=disputes`,
            hint: "তাৎক্ষণিক সাড়া দরকার",
          });
        if (rules.enabled_pending_bookings) next.push(
          {
            key: "pendingBookings",
            label: "পেন্ডিং বুকিং",
            count: pendingBookings.count || 0,
            icon: <CalendarClock className="h-4 w-4" />,
            tone: "blue",
            href: `${basePath}?tab=bookings`,
            hint: "অ্যাসাইনমেন্ট দরকার",
          });
        if (rules.enabled_low_stock) next.push(
          {
            key: "lowStock",
            label: "Low-stock পণ্য",
            count: lowStock.count || 0,
            icon: <PackageX className="h-4 w-4" />,
            tone: "purple",
            href: `${basePath}?tab=mart-overview`,
            hint: `${rules.low_stock_threshold} বা কম স্টক`,
          });
        if (rules.enabled_open_requests) next.push(
          {
            key: "requests",
            label: "নতুন রিকোয়েস্ট",
            count: openRequests.count || 0,
            icon: <AlertTriangle className="h-4 w-4" />,
            tone: "emerald",
            href: `${basePath}?tab=requests`,
            hint: "প্রক্রিয়া শুরু হয়নি",
          });
        setItems(next);
      } catch (e) {
        console.warn("[NeedsAttentionWidget] failed:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [basePath, rulesVersion]);

  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-4 md:p-5 shadow-sm"
      aria-label="Needs your attention"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center ring-1 ring-amber-500/25 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-foreground leading-tight">আপনার মনোযোগ দরকার</h3>
            <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">
              {loading ? "লোড হচ্ছে…" : total === 0 ? "সব ঠিকঠাক — কিছু পেন্ডিং নেই 🎉" : `মোট ${toBn(total)}টি কাজ অপেক্ষমাণ`}
            </p>
          </div>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {(loading ? Array.from({ length: 5 }) : items).map((it: any, i) => {
          if (!it) {
            return <div key={i} className="h-[88px] rounded-xl border border-border/50 bg-secondary/40 animate-pulse" />;
          }
          const t = toneStyles[it.tone as AttentionItem["tone"]];
          const isZero = it.count === 0;
          return (
            <button
              key={it.key}
              onClick={() => navigate(it.href)}
              className={cn(
                "group relative text-left rounded-xl border border-border/60 bg-card p-3 transition-all",
                "hover:border-primary/40 hover:shadow-md hover:-translate-y-[1px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isZero && "opacity-65"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center ring-1", t.bg, t.ring, t.text)}>
                  {it.icon}
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </div>
              <p className="text-[10.5px] font-medium text-muted-foreground mt-2 leading-tight">{it.label}</p>
              <div className="flex items-end gap-1.5 mt-0.5">
                <span className={cn("text-xl font-bold tabular-nums leading-none", isZero ? "text-foreground/60" : t.text)}>
                  {toBn(it.count)}
                </span>
                {!isZero && it.hint && (
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold", t.chip)}>{it.hint}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
};

export default NeedsAttentionWidget;