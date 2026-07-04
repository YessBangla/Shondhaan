import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface MartMessage {
  id: string;
  product_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface MartConversation {
  product_id: string;
  product_name: string;
  product_image: string | null;
  product_price: number;
  other_user_id: string;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export function useMartMessages(productId: string, otherUserId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mart-messages", productId, otherUserId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("mart_messages")
        .select("*")
        .eq("product_id", productId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as MartMessage[];
    },
    enabled: !!productId && !!otherUserId,
  });

  // Mark messages as read
  useEffect(() => {
    if (!otherUserId || !productId) return;
    const markRead = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("mart_messages")
        .update({ is_read: true })
        .eq("product_id", productId)
        .eq("sender_id", otherUserId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    };
    markRead();
  }, [productId, otherUserId, query.data]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`mart-chat-${productId}-${otherUserId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mart_messages",
        filter: `product_id=eq.${productId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["mart-messages", productId, otherUserId] });
        queryClient.invalidateQueries({ queryKey: ["mart-conversations"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [productId, otherUserId, queryClient]);

  return query;
}

export function useSendMartMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, receiverId, message }: { productId: string; receiverId: string; message: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("mart_messages").insert({
        product_id: productId,
        sender_id: user.id,
        receiver_id: receiverId,
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mart-messages"] });
      queryClient.invalidateQueries({ queryKey: ["mart-conversations"] });
    },
  });
}

export function useMartConversations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mart-conversations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: messages, error } = await supabase
        .from("mart_messages")
        .select("*, mart_products(id, name, image_url, price)")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!messages?.length) return [];

      const convMap = new Map<string, MartConversation>();

      for (const msg of messages) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const key = `${msg.product_id}_${otherUserId}`;
        const product = msg.mart_products as any;

        if (!convMap.has(key)) {
          convMap.set(key, {
            product_id: msg.product_id,
            product_name: product?.name || "Unknown",
            product_image: product?.image_url || null,
            product_price: product?.price || 0,
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

  useEffect(() => {
    const channel = supabase
      .channel("mart-conversations-rt")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mart_messages",
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["mart-conversations"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}
