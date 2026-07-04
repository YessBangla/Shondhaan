import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BadgeCounts {
  chat: number;
  bookings: number;
}

/**
 * Returns unread chat + active-booking counts for the bottom nav.
 * Uses Supabase realtime subscriptions to keep badges live.
 */
export const useBadgeCounts = (): BadgeCounts => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<BadgeCounts>({ chat: 0, bookings: 0 });

  useEffect(() => {
    if (!user) {
      setCounts({ chat: 0, bookings: 0 });
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      const [chatRes, dealRes, martRes, bookingsRes] = await Promise.all([
        supabase
          .from("booking_messages")
          .select("id", { count: "exact", head: true })
          .neq("sender_id", user.id),
        supabase
          .from("deal_messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("is_read", false),
        supabase
          .from("mart_messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("is_read", false),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["pending", "confirmed", "in_progress"]),
      ]);

      if (cancelled) return;

      const chatTotal =
        (dealRes.count || 0) + (martRes.count || 0);
      // booking_messages count is approximate; only show deal + mart unread for chat badge
      setCounts({
        chat: chatTotal,
        bookings: bookingsRes.count || 0,
      });
      // mark chatRes used to avoid lint
      void chatRes;
    };

    fetchAll();

    const channel = supabase
      .channel(`badge-counts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deal_messages" },
        fetchAll
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mart_messages" },
        fetchAll
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        fetchAll
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return counts;
};
