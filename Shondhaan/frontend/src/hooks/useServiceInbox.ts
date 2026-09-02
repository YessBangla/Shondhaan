import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { listServiceChatConversations } from "@/lib/serviceChatApi";

const SERVICE_API_BASE =
  (import.meta.env.VITE_SERVICE_API_BASE as string) || import.meta.env.VITE_SERVICE_API_BASE_URL || "";

/* ──────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────── */
export interface ServiceMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  is_read?: boolean; // ✅ ADD THIS
}

export interface ServiceConversation {
  booking_id: string;
  booking_date: string;
  booking_status: string;
  service_title: string;
  service_slug: string;
  package_name: string;
  package_price: number;
  provider_name: string;
  last_message: string;
  last_message_at: string;
  last_sender_role: string;
  unread_count: number;
}

/* ──────────────────────────────────────────────────────────────────
   Fetch user bookings from the MySQL service backend
   ────────────────────────────────────────────────────────────────── */

interface ApiBooking {
  id: string;
  service_title: string;
  service_slug: string;
  package_name: string;
  package_price: number;
  provider_name: string;
  booking_date: string;
  status: string;
  created_at: string;
}

async function fetchUserBookings(userId: number): Promise<ApiBooking[]> {
  const res = await fetch(
    `${SERVICE_API_BASE}/api/bookings?user_id=${encodeURIComponent(String(userId))}`,
    {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch bookings (${res.status})`);
  }

  const body = await res.json();

  // Try common response shapes
  const raw =
    body?.data ??
    body?.bookings ??
    body?.items ??
    body?.rows ??
    body;

  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.rows)) return raw.rows;

  return [];
}

/* ──────────────────────────────────────────────────────────────────
   Hook — returns a list of service conversations (bookings that have
   messages in booking_messages).
   ────────────────────────────────────────────────────────────────── */

export function useServiceConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<ServiceConversation[]>({
    queryKey: ["service-conversations", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        const supportRows = await listServiceChatConversations();
        if (supportRows?.length) {
          return supportRows.map((conversation) => ({
            booking_id: conversation.id,
            booking_date: conversation.created_at,
            booking_status: conversation.status,
            service_title: conversation.subject || "Support chat",
            service_slug: "support-chat",
            package_name: "Support",
            package_price: 0,
            provider_name: "Support Team",
            last_message: conversation.last_message || "",
            last_message_at: conversation.last_message_at || conversation.created_at,
            last_sender_role: "staff",
            unread_count: Number(conversation.unread_count || 0),
          }));
        }
      } catch (error) {
        console.warn("Support chat fallback failed, falling back to booking inbox:", error);
      }

      const mysqlAuth = getMySqlAuth();
      const userId = Number(mysqlAuth?.user?.id ?? user?.id);

      // 1. Fetch user bookings from MySQL service backend
      let bookings: ApiBooking[] = [];

      try {
        bookings = await fetchUserBookings(userId);
      } catch (err) {
        console.error("useServiceInbox - failed to fetch bookings:", err);
      }

      if (!bookings.length) return [];

      // 2. For each booking, fetch the latest message from booking_messages
      const bookingIds = bookings.map((b) => b.id);

      const { data: messages, error } = await supabase
        .from("booking_messages")
        .select("id, booking_id, sender_id, sender_role, message, file_url, file_name, file_type, created_at")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 3. Build a map: booking_id -> latest message
      const latestMsgMap = new Map<string, ServiceMessage>();

      if (messages?.length) {
        for (const msg of messages) {
          const key = msg.booking_id;
          if (!latestMsgMap.has(key)) {
            latestMsgMap.set(key, msg as ServiceMessage);
          }
        }
      }

      // 4. Build conversation list from bookings + messages
      const conversations: ServiceConversation[] = bookings
        .filter((b) => latestMsgMap.has(b.id))
        .map((b) => {
          const msg = latestMsgMap.get(b.id)!;
          return {
            booking_id: b.id,
            booking_date: b.booking_date || b.created_at,
            booking_status: b.status,
            service_title: b.service_title,
            service_slug: b.service_slug,
            package_name: b.package_name,
            package_price: b.package_price,
            provider_name: b.provider_name || "",
            last_message: msg.message,
            last_message_at: msg.created_at,
            last_sender_role: msg.sender_role,
            unread_count: 0,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.last_message_at).getTime() -
            new Date(a.last_message_at).getTime()
        );

      return conversations;
    },
  });

  // ── Realtime subscription for new booking_messages ─────────────
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("service-inbox-rt")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_messages",
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["service-conversations", user.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}

/* ──────────────────────────────────────────────────────────────────
   Hook — fetch messages for a specific booking
   ────────────────────────────────────────────────────────────────── */

export function useServiceMessages(bookingId: string) {
  const { user } = useAuth();

  return useQuery<ServiceMessage[]>({
    queryKey: ["service-messages", bookingId],
    enabled: !!user && !!bookingId,
queryFn: async () => {
  // 🔐 Get MySQL auth user (since you're not using Supabase auth)
  const auth = getMySqlAuth();
  const userId = auth?.user?.id;

  if (!userId) return [];

  // 1️⃣ Fetch bookings from your backend
  const bookings = await fetchUserBookings(userId);

  if (!bookings.length) return [];

  // 2️⃣ Get booking IDs
  const bookingIds = bookings.map((b) => b.id);

  // 3️⃣ Fetch messages from Supabase
  const { data: messages, error } = await supabase
    .from("booking_messages")
    .select("*")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  // 4️⃣ Build conversations
  const conversations: ServiceConversation[] = bookings.map((booking) => {
    const msgs = messages?.filter((m) => m.booking_id === booking.id) || [];

    const lastMsg = msgs[0];

    return {
      booking_id: booking.id,
      booking_date: booking.booking_date,
      booking_status: booking.status,
      service_title: booking.service_title,
      service_slug: booking.service_slug,
      package_name: booking.package_name,
      package_price: booking.package_price,
      provider_name: booking.provider_name,
      last_message: lastMsg?.message || "",
      last_message_at: lastMsg?.created_at || booking.created_at,
      last_sender_role: lastMsg?.sender_role || "system",
      unread_count: msgs.filter((m) => !m.is_read).length || 0,
    };
  });

  return conversations;
}
  });
}

