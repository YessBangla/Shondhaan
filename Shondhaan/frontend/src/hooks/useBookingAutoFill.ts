import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BookingAutoFill {
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  preferred_time?: string;
}

/**
 * Pulls the user's most recent booking (if any) and surfaces sane
 * defaults for the next checkout — so power users can confirm a booking
 * with one tap. Falls back to the auth profile metadata.
 */
export function useBookingAutoFill() {
  const { user } = useAuth();
  const [defaults, setDefaults] = useState<BookingAutoFill>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("bookings")
        .select("customer_name, customer_phone, customer_address, booking_time")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setDefaults({
          customer_name: data.customer_name ?? undefined,
          customer_phone: data.customer_phone ?? undefined,
          customer_address: data.customer_address ?? undefined,
          preferred_time: data.booking_time ?? undefined,
        });
      } else {
        // Fallback: profile metadata
        const meta = (user.user_metadata as Record<string, unknown>) || {};
        setDefaults({
          customer_name: (meta.full_name as string) || (meta.name as string) || undefined,
          customer_phone: (meta.phone as string) || undefined,
        });
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { defaults, loading, refresh };
}
