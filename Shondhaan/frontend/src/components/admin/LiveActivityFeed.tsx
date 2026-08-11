import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, ShoppingBag, UserPlus, Tag, AlertTriangle, MessageSquare,
  Pause, Play, Filter, Settings2, Database,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const toBn = (n: number | string) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

type EventKind = "booking" | "user" | "deal" | "dispute" | "message" | "request";

interface FeedEvent {
  id: string;
  kind: EventKind;
  title: string;
  meta?: string;
  ts: string;
}

const kindConfig: Record<EventKind, { icon: React.ReactNode; tone: string; label: string }> = {
  booking: { icon: <ShoppingBag className="h-3.5 w-3.5" />, tone: "text-blue-600 bg-blue-500/10",     label: "বুকিং" },
  user:    { icon: <UserPlus className="h-3.5 w-3.5" />,    tone: "text-purple-600 bg-purple-500/10", label: "ইউজার" },
  deal:    { icon: <Tag className="h-3.5 w-3.5" />,         tone: "text-amber-600 bg-amber-500/10",   label: "ডিল" },
  dispute: { icon: <AlertTriangle className="h-3.5 w-3.5" />, tone: "text-red-600 bg-red-500/10",     label: "অভিযোগ" },
  message: { icon: <MessageSquare className="h-3.5 w-3.5" />, tone: "text-emerald-600 bg-emerald-500/10", label: "মেসেজ" },
  request: { icon: <Activity className="h-3.5 w-3.5" />,     tone: "text-indigo-600 bg-indigo-500/10",   label: "রিকোয়েস্ট" },
};

/** Maps each kind to the source table — surfaced in the settings popover */
const kindToTable: Record<EventKind, string> = {
  booking: "bookings",
  user: "profiles",
  deal: "deal_listings",
  dispute: "disputes",
  message: "booking_messages",
  request: "service_requests",
};

const SOURCES_KEY = "live_activity_sources_v1";
const ALL_KINDS: EventKind[] = ["booking", "user", "deal", "dispute", "message", "request"];

const timeAgo = (ts: string) => {
  const sec = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (sec < 60) return `${toBn(sec)} সে আগে`;
  if (sec < 3600) return `${toBn(Math.floor(sec / 60))} মি আগে`;
  if (sec < 86400) return `${toBn(Math.floor(sec / 3600))} ঘ আগে`;
  return `${toBn(Math.floor(sec / 86400))} দিন আগে`;
};

/** Realtime activity stream pulled from key tables via Postgres changes. */
const LiveActivityFeed = ({ className }: { className?: string }) => {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<EventKind | "all">("all");
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enabledSources, setEnabledSources] = useState<Record<EventKind, boolean>>(() => {
    try {
      const raw = localStorage.getItem(SOURCES_KEY);
      if (raw) return { ...Object.fromEntries(ALL_KINDS.map((k) => [k, true])), ...JSON.parse(raw) } as any;
    } catch {}
    return Object.fromEntries(ALL_KINDS.map((k) => [k, true])) as any;
  });
  const [totals, setTotals] = useState<Record<EventKind, number>>({
    booking: 0, user: 0, deal: 0, dispute: 0, message: 0, request: 0,
  });

  useEffect(() => {
    try { localStorage.setItem(SOURCES_KEY, JSON.stringify(enabledSources)); } catch {}
  }, [enabledSources]);

  // Initial seed
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Seed events + accurate server-side counts in parallel
        const [b, u, d, dis, req, bC, uC, dC, disC, reqC, msgC] = await Promise.all([
          supabase.from("bookings").select("id,service_title,customer_name,created_at").order("created_at", { ascending: false }).limit(5),
          supabase.from("profiles").select("user_id,display_name,created_at").order("created_at", { ascending: false }).limit(5),
          supabase.from("deal_listings").select("id,title,price,created_at").order("created_at", { ascending: false }).limit(5),
          supabase.from("disputes").select("id,subject,ticket_no,created_at").order("created_at", { ascending: false }).limit(3),
          supabase.from("service_requests").select("id,service_category,tracking_token,created_at").order("created_at", { ascending: false }).limit(3),
          supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
          supabase.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
          supabase.from("deal_listings").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
          supabase.from("disputes").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
          supabase.from("service_requests").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
          supabase.from("booking_messages").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        ]);
        if (!alive) return;
        setTotals({
          booking: bC.count || 0, user: uC.count || 0, deal: dC.count || 0,
          dispute: disC.count || 0, request: reqC.count || 0, message: msgC.count || 0,
        });
        const out: FeedEvent[] = [
          ...(b.data || []).map((x: any) => ({ id: `b-${x.id}`, kind: "booking" as const, title: x.service_title || "নতুন বুকিং", meta: x.customer_name, ts: x.created_at })),
          ...(u.data || []).map((x: any) => ({ id: `u-${x.user_id}`, kind: "user" as const, title: x.display_name || "নতুন ইউজার", meta: "প্রোফাইল তৈরি", ts: x.created_at })),
          ...(d.data || []).map((x: any) => ({ id: `d-${x.id}`, kind: "deal" as const, title: x.title, meta: x.price ? `৳${toBn(x.price)}` : "", ts: x.created_at })),
          ...(dis.data || []).map((x: any) => ({ id: `dis-${x.id}`, kind: "dispute" as const, title: x.subject || "নতুন অভিযোগ", meta: x.ticket_no, ts: x.created_at })),
          ...(req.data || []).map((x: any) => ({ id: `r-${x.id}`, kind: "request" as const, title: x.service_category || "রিকোয়েস্ট", meta: x.tracking_token, ts: x.created_at })),
        ].sort((a, b) => +new Date(b.ts) - +new Date(a.ts)).slice(0, 20);
        setEvents(out);
      } catch (e) {
        console.warn("[LiveActivityFeed] seed failed", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Realtime listeners
  useEffect(() => {
    if (paused) return;
    const push = (ev: FeedEvent) => {
      if (!enabledSources[ev.kind]) return;
      setEvents((prev) => [ev, ...prev].slice(0, 30));
      setTotals((prev) => ({ ...prev, [ev.kind]: (prev[ev.kind] || 0) + 1 }));
    };
    const channel = supabase
      .channel("live-activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, (p: any) => {
        push({ id: `b-${p.new.id}`, kind: "booking", title: p.new.service_title || "নতুন বুকিং", meta: p.new.customer_name, ts: p.new.created_at });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (p: any) => {
        push({ id: `u-${p.new.user_id}`, kind: "user", title: p.new.display_name || "নতুন ইউজার", meta: "নতুন সাইনআপ", ts: p.new.created_at });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "deal_listings" }, (p: any) => {
        push({ id: `d-${p.new.id}`, kind: "deal", title: p.new.title || "নতুন ডিল", meta: p.new.price ? `৳${toBn(p.new.price)}` : "", ts: p.new.created_at });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "disputes" }, (p: any) => {
        push({ id: `dis-${p.new.id}`, kind: "dispute", title: p.new.subject || "নতুন অভিযোগ", meta: p.new.ticket_no, ts: p.new.created_at });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests" }, (p: any) => {
        push({ id: `r-${p.new.id}`, kind: "request", title: p.new.service_category || "নতুন রিকোয়েস্ট", meta: p.new.tracking_token, ts: p.new.created_at });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [paused, enabledSources]);

  const visible = useMemo(
    () => events.filter((e) => enabledSources[e.kind]),
    [events, enabledSources]
  );
  const filtered = useMemo(
    () => filter === "all" ? visible : visible.filter((e) => e.kind === filter),
    [visible, filter]
  );

  const filters: { key: EventKind | "all"; label: string }[] = [
    { key: "all", label: "সব" },
    { key: "booking", label: "বুকিং" },
    { key: "user", label: "ইউজার" },
    { key: "deal", label: "ডিল" },
    { key: "dispute", label: "অভিযোগ" },
    { key: "request", label: "রিকোয়েস্ট" },
  ];

  return (
    <section className={cn("rounded-2xl border border-border/60 bg-card overflow-hidden", className)}>
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center ring-1 ring-emerald-500/25">
            <Activity className="h-4 w-4" />
            {!paused && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse ring-2 ring-card" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-bold text-foreground leading-tight">লাইভ অ্যাকটিভিটি</h3>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              {paused ? "স্থগিত" : "রিয়েল-টাইম"} • {toBn(filtered.length)} ইভেন্ট
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
              settingsOpen ? "bg-primary/15 text-primary" : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
            )}
            title="সোর্স সেটিংস"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setPaused((p) => !p)}
            className="h-7 w-7 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            title={paused ? "চালু করুন" : "স্থগিত করুন"}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          <AnimatePresence>
            {settingsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border/60 bg-card shadow-2xl z-50 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-border/60 bg-secondary/30 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[12px] font-bold">ইভেন্ট সোর্স</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {ALL_KINDS.map((k) => {
                      const cfg = kindConfig[k];
                      const checked = !!enabledSources[k];
                      return (
                        <label key={k} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setEnabledSources((p) => ({ ...p, [k]: e.target.checked }))}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", cfg.tone)}>{cfg.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold leading-tight">{cfg.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight font-mono">{kindToTable[k]}</p>
                          </div>
                          <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                            {toBn(totals[k] || 0)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="px-3 py-2 border-t border-border/60 text-[10px] text-muted-foreground">
                    গত ২৪ ঘণ্টার প্রকৃত সংখ্যা (server-side)
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-3 py-2 border-b border-border/40 bg-secondary/20">
        <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
        {filters.map((f) => {
          const count = f.key === "all"
            ? Object.entries(totals).reduce((s, [k, v]) => s + (enabledSources[k as EventKind] ? v : 0), 0)
            : (totals[f.key as EventKind] || 0);
          const disabled = f.key !== "all" && !enabledSources[f.key as EventKind];
          return (
            <button
              key={f.key}
              onClick={() => !disabled && setFilter(f.key)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold whitespace-nowrap transition-colors",
                filter === f.key
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                disabled && "opacity-40 cursor-not-allowed"
              )}
              title={disabled ? "এই সোর্স বন্ধ" : undefined}
            >
              {f.label}
              <span className={cn(
                "rounded-full px-1 text-[9px] tabular-nums",
                filter === f.key ? "bg-primary-foreground/20" : "bg-muted-foreground/15"
              )}>{toBn(count)}</span>
            </button>
          );
        })}
      </div>

      <div className="max-h-[420px] overflow-y-auto p-2 space-y-1">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-secondary/40 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-xs text-muted-foreground">এই ফিল্টারে কোনো ইভেন্ট নেই</p>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((e) => {
              const cfg = kindConfig[e.kind];
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-secondary/50 transition-colors"
                >
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", cfg.tone)}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground truncate leading-tight">{e.title}</p>
                    {e.meta && <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{e.meta}</p>}
                  </div>
                  <span className="text-[9.5px] text-muted-foreground/70 tabular-nums shrink-0">{timeAgo(e.ts)}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};

export default LiveActivityFeed;