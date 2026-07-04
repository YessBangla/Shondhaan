import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const KEY = "yess_engagement_log_v1";
const PROMPTED_KEY = "yess_engagement_notif_prompted";

interface Visit { ts: number; hour: number; }

/**
 * Logs each session's local hour to derive the user's "best engagement
 * window". When at least 5 visits are logged AND we're within ±1h of the
 * dominant hour AND we have permission, we schedule a one-shot
 * service-worker style local notification to nudge the user. Fully
 * client-side, privacy-friendly (data never leaves the device).
 */
const SmartNotificationScheduler = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const log: Visit[] = raw ? JSON.parse(raw) : [];
      const hour = new Date().getHours();
      log.push({ ts: Date.now(), hour });
      // Keep last 30
      const trimmed = log.slice(-30);
      localStorage.setItem(KEY, JSON.stringify(trimmed));

      if (trimmed.length < 5) return;

      // Find dominant hour (mode)
      const counts: Record<number, number> = {};
      trimmed.forEach((v) => { counts[v.hour] = (counts[v.hour] || 0) + 1; });
      const dominant = Number(
        Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0],
      );

      // If within 1h of dominant and notifications granted → fire a nudge
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        Math.abs(hour - dominant) <= 1
      ) {
        const last = Number(localStorage.getItem(PROMPTED_KEY) || "0");
        // Throttle to once per 6h
        if (Date.now() - last > 6 * 60 * 60 * 1000) {
          localStorage.setItem(PROMPTED_KEY, String(Date.now()));
          new Notification(
            bn ? "Yess Service • আপনার জন্য নতুন অফার" : "Yess Service • Fresh offers for you",
            {
              body: bn
                ? "আজকের ফ্ল্যাশ ডিল মিস করবেন না — এখনই দেখুন!"
                : "Don't miss today's flash deals — check now!",
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              tag: "yess-engage",
            },
          );
        }
      }
    } catch {
      /* silent */
    }
  }, [bn]);

  return null;
};

export default SmartNotificationScheduler;