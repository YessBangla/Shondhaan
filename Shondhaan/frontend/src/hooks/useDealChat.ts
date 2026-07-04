import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface DealMessage {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DealConversation {
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  listing_price: number;
  other_user_id: string;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export function useDealMessages(listingId: string, otherUserId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["deal-messages", listingId, otherUserId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("deal_messages")
        .select("*")
        .eq("listing_id", listingId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as DealMessage[];
    },
    enabled: !!listingId && !!otherUserId,
  });

  // Mark messages as read
  useEffect(() => {
    if (!otherUserId || !listingId) return;
    const markRead = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("deal_messages")
        .update({ is_read: true })
        .eq("listing_id", listingId)
        .eq("sender_id", otherUserId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    };
    markRead();
  }, [listingId, otherUserId, query.data]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`deal-chat-${listingId}-${otherUserId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "deal_messages",
        filter: `listing_id=eq.${listingId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["deal-messages", listingId, otherUserId] });
        queryClient.invalidateQueries({ queryKey: ["deal-conversations"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [listingId, otherUserId, queryClient]);

  return query;
}

export function useSendDealMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, receiverId, message }: { listingId: string; receiverId: string; message: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("deal_messages").insert({
        listing_id: listingId,
        sender_id: user.id,
        receiver_id: receiverId,
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-messages"] });
      queryClient.invalidateQueries({ queryKey: ["deal-conversations"] });
    },
  });
}

export function useDealConversations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["deal-conversations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get all messages involving current user
      const { data: messages, error } = await supabase
        .from("deal_messages")
        .select("*, deal_listings(id, title, images, price)")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!messages?.length) return [];

      // Group by listing + other user
      const convMap = new Map<string, DealConversation>();

      for (const msg of messages) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const key = `${msg.listing_id}_${otherUserId}`;
        const listing = msg.deal_listings as any;

        if (!convMap.has(key)) {
          const images = Array.isArray(listing?.images) ? listing.images : [];
          convMap.set(key, {
            listing_id: msg.listing_id,
            listing_title: listing?.title || "Unknown",
            listing_image: images[0] || null,
            listing_price: listing?.price || 0,
            other_user_id: otherUserId,
            other_user_name: "",
            last_message: msg.message,
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }

        const conv = convMap.get(key)!;
        if (msg.receiver_id === user.id && !msg.is_read) {
          conv.unread_count++;
        }
      }

      // Fetch other user names
      const otherIds = [...new Set([...convMap.values()].map(c => c.other_user_id))];
      if (otherIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", otherIds);

        if (profiles) {
          for (const conv of convMap.values()) {
            const p = profiles.find(pr => pr.user_id === conv.other_user_id);
            conv.other_user_name = p?.display_name || "ব্যবহারকারী";
          }
        }
      }

      return [...convMap.values()].sort((a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
  });

  // Realtime for new messages
  useEffect(() => {
    const channel = supabase
      .channel("deal-conversations-rt")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "deal_messages",
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["deal-conversations"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}
