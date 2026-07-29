import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = "VITE_DEAL_API_BASE_URL/api";

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
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean | number;
  created_at: string;
}

export interface DealConversation {
  conversation_id: string;
  other_user_id: string;
  listing_title: string;
  listing_image: string | null;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

// Full message history for one listing + the other participant.
// Also marks that thread as read as a side effect, matching "opening a
// chat clears its unread badge" behavior.
export function useDealMessages(conversation_id: string, otherUserId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<DealMessage[]>({
    queryKey: ["deal-messages", conversation_id, otherUserId],
    enabled: !!user && !!conversation_id && !!otherUserId,
    queryFn: async () => {
      // backend expects: /thread?conversationId=...&userId=...
      const data = await apiFetch(
        `/deal/messages/thread?conversationId=${conversation_id}&userId=${user!.id}&otherUserId=${otherUserId}`
      );
      const messages: DealMessage[] = data.data || data;

      // side effect handled by backend THREAD route (it marks messages read)
      // so we only refresh inbox counters after it succeeds.
      queryClient.invalidateQueries({ queryKey: ["deal-conversations"] });

      return messages;
    },
  });
}

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

// Inbox conversation list for the current user.
export function useDealConversations() {
  const { user } = useAuth();

  return useQuery<DealConversation[]>({
    queryKey: ["deal-conversations", user?.id],

    // ✅ FIXED
    enabled: !!user?.id,

    queryFn: async () => {
      console.log("🚀 Fetching conversations for user:", user?.id);

      const data = await apiFetch(
        `/deal/messages/conversations?userId=${user!.id}`
      );

      console.log("✅ API RESULT:", data);

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
    mutationFn: async ({
      conversation_id,
      receiverId,
      message,
    }: {
      conversation_id: string;
      receiverId: string;
      message: string;
    }) => {
      const data = await apiFetch(`/deal/messages`, {
        method: "POST",
        body: JSON.stringify({ conversation_id, senderId: user?.id, receiverId, message }),
      });
      return data.data || data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deal-messages", variables.conversation_id, variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ["deal-conversations"] });
    },
  });
}