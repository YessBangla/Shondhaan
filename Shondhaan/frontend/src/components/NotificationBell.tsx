import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMartSellerNotifications,
  isNumericMartUserId,
  listMartSellerNotifications,
  markAllMartSellerNotificationsReadRemote,
  markMartSellerNotificationReadRemote,
} from "@/lib/martSellerNotifications";

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "";

// Resolves a numeric product id to its real slug so the product URL can show
// the readable product name (e.g. /mart/product/black-dress) instead of the
// legacy mysql-product-<id> pattern. Falls back to null so callers can keep
// the legacy pattern (the product-detail page will auto-upgrade the URL).
async function resolveProductSlug(productId: string | number): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(String(productId))}`);
    const json = await res.json().catch(() => ({}));
    return json?.data?.slug || null;
  } catch {
    return null;
  }
}

interface Notification {
  id: string;
  product_id?: string | number | null;
  title: string;
  message: string;
  is_read: boolean;
  type: string;
  action_url?: string | null;
  created_at: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    if (isNumericMartUserId(user.id)) {
      setNotifications(await fetchMartSellerNotifications(user.id));
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  }, [user]);

  useEffect(() => {
    // Avoid locking UI if Supabase/backend is down.
    // If request fails, just keep empty notifications instead of throwing.
    fetchNotifications().catch(() => {
      setNotifications([]);
    });
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user || !isNumericMartUserId(user.id)) return;
    const handler = () => setNotifications(listMartSellerNotifications(user.id));
    window.addEventListener("yess-mart-seller-notifications-changed", handler);
    return () => window.removeEventListener("yess-mart-seller-notifications-changed", handler);
  }, [user]);

  useEffect(() => {
    if (!user || !isNumericMartUserId(user.id)) return;

    const interval = window.setInterval(() => {
      fetchNotifications().catch(() => {});
    }, 15000);

    return () => window.clearInterval(interval);
  }, [fetchNotifications, user]);


  // Realtime (disabled temporarily to prevent sidebar freeze when backend/Supabase is slow)
  // useEffect(() => {
  //   if (!user) return;
  //   const channel = supabase
  //     .channel("notif-bell")
  //     .on(
  //       "postgres_changes",
  //       { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
  //       (payload: any) => {
  //         setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20));
  //       }
  //     )
  //     .subscribe();
  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, [user]);


  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target;
      if (ref.current && target instanceof Node && !ref.current.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    if (!user) return;

    if (isNumericMartUserId(user.id)) {
      await markMartSellerNotificationReadRemote(id, user.id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      return;
    }

    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    if (isNumericMartUserId(user.id)) {
      await markAllMartSellerNotificationsReadRemote(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      return;
    }

    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const toggleOpen = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      fetchNotifications().catch(() => {});
    }
  };

  const openNotification = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    setOpen(false);
    const fallbackProductTab = notification.type === "mart_product_review"
      ? "reviews"
      : notification.type === "mart_product_question"
        ? "qa"
        : null;
    const fallbackHash = fallbackProductTab === "reviews" ? "product-reviews" : "product-qa";
    const fallbackProductUrl = async () => {
      if (notification.action_url || fallbackProductTab === null || notification.product_id == null) return null;
      const slug = await resolveProductSlug(notification.product_id);
      return slug
        ? `/mart/product/${encodeURIComponent(slug)}?tab=${fallbackProductTab}#${fallbackHash}`
        : `/mart/product/mysql-product-${encodeURIComponent(String(notification.product_id))}?tab=${fallbackProductTab}#${fallbackHash}`;
    };
    const actionUrl = notification.action_url || (await fallbackProductUrl());

    if (!actionUrl) return;

    if (actionUrl.startsWith(window.location.origin)) {
      navigate(actionUrl.replace(window.location.origin, ""));
      return;
    }

    if (actionUrl.startsWith("/")) {
      navigate(actionUrl);
      return;
    }

    window.location.href = actionUrl;
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="relative flex items-center justify-center rounded-lg border border-border p-2 text-foreground hover:bg-secondary transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-80 max-h-[400px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-bold text-foreground">নোটিফিকেশন</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                    <CheckCheck className="h-3 w-3" /> সব পঠিত
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[340px]">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">কোনো নোটিফিকেশন নেই</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/50 ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      !n.is_read ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
                      {!n.is_read ? <Bell className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-1">
                        {new Date(n.created_at).toLocaleDateString("bn-BD")} {new Date(n.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
