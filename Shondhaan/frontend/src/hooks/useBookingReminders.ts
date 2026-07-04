import { useEffect } from "react";
import { toast } from "sonner";

const KEY = "yess_booking_reminders_v1";

export interface Reminder {
  id: string;
  bookingId: string;
  title: string;
  fireAt: number; // ms epoch
  fired?: boolean;
}

function read(): Reminder[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(rs: Reminder[]) {
  try { localStorage.setItem(KEY, JSON.stringify(rs)); } catch {}
}

/** Add a reminder that fires N minutes before fireAt (default 30 min). */
export function scheduleBookingReminder(opts: {
  bookingId: string;
  title: string;
  scheduledAt: Date | string;
  leadMinutes?: number;
}) {
  const lead = (opts.leadMinutes ?? 30) * 60_000;
  const fireAt = new Date(opts.scheduledAt).getTime() - lead;
  if (Number.isNaN(fireAt) || fireAt < Date.now()) return false;
  const rs = read();
  if (rs.some((r) => r.bookingId === opts.bookingId)) return false;
  rs.push({ id: `r-${Date.now()}`, bookingId: opts.bookingId, title: opts.title, fireAt });
  write(rs);
  return true;
}

/** Mounts globally — polls every 30s, fires browser + toast notifications. */
export function useBookingReminders(bn: boolean) {
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const rs = read();
      let changed = false;
      rs.forEach((r) => {
        if (!r.fired && r.fireAt <= now) {
          r.fired = true;
          changed = true;
          const body = bn
            ? `${r.title} — শীঘ্রই শুরু হবে`
            : `${r.title} starts soon`;
          toast.info(bn ? "বুকিং রিমাইন্ডার" : "Booking reminder", { description: body, duration: 7000 });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification(bn ? "Yess Service • রিমাইন্ডার" : "Yess Service • Reminder", {
                body, icon: "/favicon.ico", tag: `reminder-${r.bookingId}`,
              });
            } catch {}
          }
        }
      });
      if (changed) write(rs.filter((r) => !r.fired || now - r.fireAt < 60_000));
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [bn]);
}