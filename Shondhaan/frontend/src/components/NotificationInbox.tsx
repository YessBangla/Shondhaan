import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, Trash2 } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface InboxNotification {
  id: string;
  title: string;
  body?: string;
  time: number;
  read?: boolean;
  href?: string;
  type?: "booking" | "promo" | "system" | "chat";
}

const STORAGE_KEY = "yess_notif_inbox";
const MAX = 30;

export function readInbox(): InboxNotification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function pushInboxNotification(n: Omit<InboxNotification, "id" | "time" | "read">) {
  const item: InboxNotification = { ...n, id: crypto.randomUUID(), time: Date.now(), read: false };
  const list = [item, ...readInbox()].slice(0, MAX);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("yess:inbox-update"));
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  booking: "bg-blue-500",
  promo: "bg-pink-500",
  system: "bg-muted-foreground",
  chat: "bg-green-500",
};

export default function NotificationInbox({ open, onClose }: Props) {
  const [items, setItems] = useState<InboxNotification[]>([]);
  const bn = (typeof window !== "undefined" && (localStorage.getItem("yess_lang") || "bn") === "bn");

  useEffect(() => {
    if (!open) return;
    setItems(readInbox());
    const onUpd = () => setItems(readInbox());
    window.addEventListener("yess:inbox-update", onUpd);
    return () => window.removeEventListener("yess:inbox-update", onUpd);
  }, [open]);

  const markAllRead = () => {
    haptic("light");
    const next = items.map((i) => ({ ...i, read: true }));
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("yess:inbox-update"));
  };

  const remove = (id: string) => {
    haptic("light");
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("yess:inbox-update"));
  };

  const clearAll = () => {
    haptic("medium");
    setItems([]);
    localStorage.setItem(STORAGE_KEY, "[]");
    window.dispatchEvent(new CustomEvent(":inbox-update"));
  };

  const fmtTime = (t: number) => {
    const d = Math.round((Date.now() - t) / 60000);
    if (d < 1) return bn ? "এখন" : "now";
    if (d < 60) return bn ? `${d} মি` : `${d}m`;
    if (d < 1440) return bn ? `${Math.floor(d / 60)} ঘ` : `${Math.floor(d / 60)}h`;
    return bn ? `${Math.floor(d / 1440)} দিন` : `${Math.floor(d / 1440)}d`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 to-transparent p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {bn ? "নোটিফিকেশন" : "Notifications"}
                </h3>
                {items.length > 0 && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {items.length}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="rounded-full p-1 hover:bg-accent" aria-label="close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {items.length > 0 && (
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 text-xs">
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Check className="h-3 w-3" />
                  {bn ? "সব পঠিত" : "Mark all read"}
                </button>
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  {bn ? "মুছুন" : "Clear all"}
                </button>
              </div>
            )}

            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {items.length === 0 ? (
                <li className="p-8 text-center">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {bn ? "কোনো নোটিফিকেশন নেই" : "No notifications yet"}
                  </p>
                </li>
              ) : (
                items.map((n) => (
                  <motion.li
                    key={n.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "group relative flex gap-3 p-4 transition hover:bg-accent/40",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", TYPE_COLORS[n.type || "system"])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        {n.href ? (
                          <a
                            href={n.href}
                            onClick={onClose}
                            className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary"
                          >
                            {n.title}
                          </a>
                        ) : (
                          <p className="line-clamp-2 text-sm font-semibold text-foreground">{n.title}</p>
                        )}
                        <span className="shrink-0 text-[10px] text-muted-foreground">{fmtTime(n.time)}</span>
                      </div>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      )}
                    </div>
                    <button
                      onClick={() => remove(n.id)}
                      className="opacity-0 transition group-hover:opacity-100"
                      aria-label="remove"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </motion.li>
                ))
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
