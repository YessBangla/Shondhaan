import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ArrowLeft, CheckCheck, LogIn, Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { timeAgo } from "@/lib/i18nFormat";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

const typeAccent: Record<string, string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-destructive",
  booking: "bg-primary",
  payment: "bg-emerald-600",
  job: "bg-indigo-500",
  mart: "bg-orange-500",
  deal: "bg-amber-500",
};

const Notifications = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("app_notifications")
      .select("id, title, message, type, priority, link_url, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setItems(data as AppNotification[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime: live-update items when notifications are inserted/updated/deleted for this user
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`app_notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as AppNotification;
          setItems((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as AppNotification;
          setItems((prev) => prev.map((n) => (n.id === row.id ? { ...n, ...row } : n)));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "app_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const oldRow = payload.old as { id?: string };
          if (!oldRow?.id) return;
          setItems((prev) => prev.filter((n) => n.id !== oldRow.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user) return;
    const unread = items.filter((n) => !n.is_read).map((n) => n.id);
    if (unread.length === 0) return;
    await supabase
      .from("app_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unread);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleOpen = async (n: AppNotification) => {
    if (!n.is_read && user) {
      await supabase
        .from("app_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    if (n.link_url) navigate(n.link_url);
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate(-1)}
            aria-label={bn ? "ফিরে যান" : "Back"}
            className="press flex h-9 w-9 items-center justify-center rounded-xl text-foreground/85 hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-bold tracking-tight text-foreground">
              {bn ? "নোটিফিকেশন" : "Notifications"}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {user
                ? unreadCount > 0
                  ? bn
                    ? `${unreadCount}টি অপঠিত`
                    : `${unreadCount} unread`
                  : bn
                  ? "সব পঠিত"
                  : "All caught up"
                : bn
                ? "অতিথি"
                : "Guest"}
            </p>
          </div>
        </div>

        {user && unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="press flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-secondary/80"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {bn ? "সব পঠিত করুন" : "Mark all read"}
          </button>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {/* Guest state */}
        {!user ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 flex flex-col items-center rounded-3xl border border-border bg-card/80 p-6 text-center shadow-sm backdrop-blur-xl"
          >
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="h-7 w-7" strokeWidth={2.1} />
            </div>
            <h2 className="font-heading text-lg font-bold text-foreground">
              {bn ? "এখনও কোনো নোটিফিকেশন নেই" : "No notifications yet"}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {bn
                ? "আপনার বুকিং, অর্ডার ও আপডেট দেখতে অ্যাকাউন্টে লগইন করুন।"
                : "Sign in to see updates about your bookings, orders, and more."}
            </p>
            <Link
              to="/login"
              className="press mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary/90"
            >
              <LogIn className="h-4 w-4" />
              {bn ? "লগইন করুন" : "Sign in"}
            </Link>
          </motion.div>
        ) : loading ? (
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex flex-col items-center rounded-3xl border border-border bg-card/70 p-8 text-center"
          >
            <Inbox className="mb-3 h-10 w-10 text-muted-foreground" strokeWidth={1.6} />
            <p className="font-heading text-base font-semibold text-foreground">
              {bn ? "কোনো নোটিফিকেশন নেই" : "Nothing here yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {bn ? "নতুন আপডেট এলে আপনাকে জানাব।" : "We'll let you know when something arrives."}
            </p>
          </motion.div>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => handleOpen(n)}
                  className={`press group flex w-full items-start gap-3 rounded-2xl border border-border bg-card/80 p-3 text-left shadow-sm backdrop-blur-xl transition-colors hover:bg-card ${
                    !n.is_read ? "ring-1 ring-primary/30" : ""
                  }`}
                >
                  <span
                    className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                      typeAccent[n.type] || "bg-muted-foreground/40"
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`truncate text-sm ${
                          n.is_read ? "font-medium text-foreground/85" : "font-bold text-foreground"
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10.5px] text-muted-foreground">
                        {timeAgo(n.created_at, language)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted-foreground">
                      {n.message}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default Notifications;