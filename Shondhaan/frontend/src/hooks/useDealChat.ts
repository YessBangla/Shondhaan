import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = "http://localhost:4000/api";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

export interface DealMessage {
  id: string | number;
  conversation_id: string;
  listing_id?: string;
  sender_id: string;
  receiver_id?: string;
  message: string;
  is_read: boolean | number;
  created_at: string;
}

export interface DealConversation {
  conversation_id: string;
  listing_id: string;
  other_user_id: string;
  listing_title: string;
  listing_image: string | null;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

// Full message history for a conversation. Also marks it read for the
// current user as a side effect (server-side, in the /thread route).
export function useDealMessages(conversationId: string, otherUserId: string) {
  const { user } = useAuth();

  return useQuery<DealMessage[]>({
    queryKey: ["deal-messages", conversationId, otherUserId],
    enabled: !!user && !!conversationId,
    queryFn: async () => {
      const data = await apiFetch(`/deal/messages/thread?conversationId=${conversationId}&userId=${user!.id}`);
      return data.data || data;
    },
  });
}

// Inbox conversation list for the current user.
export function useDealConversations() {
  const { user } = useAuth();

  return useQuery<DealConversation[]>({
    queryKey: ["deal-conversations", user?.id],

    // ✅ FIXED
    enabled: !!user?.id,

    queryFn: async () => {
      console.log("🚀 Fetching for user:", user?.id);

      const data = await apiFetch(
        `/deal/messages/conversations?userId=${user!.id}`
      );

      console.log("✅ API RESPONSE:", data);

      return data.data || data;
    },
  });
}

// Resolve-or-create a conversation before opening a fresh chat — e.g. a
// "Message seller" button on a listing detail page, where no
// conversation_id exists yet. Once resolved, pass the returned id into
// <DealChatModal conversation_id={...} />.
export function useStartDealConversation() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ listingId, otherUserId }: { listingId: string; otherUserId: string }) => {
      const data = await apiFetch(`/deal/messages/conversation`, {
        method: "POST",
        body: JSON.stringify({ listingId, userId: user?.id, otherUserId }),
      });
      return data.data || data;
    },
  });
}

// REST fallback for sending — DealChatModal sends over the socket by
// default; this exists in case you need a non-socket path somewhere.
export function useSendDealMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string; message: string }) => {
      const data = await apiFetch(`/deal/messages`, {
        method: "POST",
        body: JSON.stringify({ conversationId, senderId: user?.id, message }),
      });
      return data.data || data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deal-messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["deal-conversations"] });
    },
  });
}