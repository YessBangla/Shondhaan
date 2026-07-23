import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";

export interface ServiceChatConversation {
  id: string;
  visitor_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  subject?: string | null;
  status: string;
  last_message?: string | null;
  last_message_at?: string | null;
  created_at: string;
  updated_at?: string;
  unread_count?: number;
  is_logged_in_user?: boolean;
}

export interface ServiceChatMessage {
  id: string;
  conversation_id: string;
  sender_role: "customer" | "staff" | string;
  sender_id?: string | null;
  sender_name?: string | null;
  body: string;
  read_by_staff?: boolean;
  read_by_customer?: boolean;
  created_at: string;
}

export interface ServiceChatPayload {
  conversation: ServiceChatConversation;
  message: ServiceChatMessage;
}

const API_BASE = `${(INDIVIDUAL_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "")}/api/service-chat`;
const VISITOR_KEY = "yess_service_chat_visitor_id";

export const getServiceChatVisitorId = () => {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return `visitor-${Date.now()}`;
  }
};

export const getServiceChatToken = () => getMySqlAuth()?.token || "";

const headers = () => {
  const token = getServiceChatToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Service chat request failed");
  return data as T;
}

export async function createServiceChatConversation(message: string) {
  const auth = getMySqlAuth();
  const user = auth?.user;

  const response = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      message,
      visitor_id: getServiceChatVisitorId(),
      user_name: user?.name,
      user_email: user?.email,
      user_phone: user?.mobile,
      subject: "Service support",
    }),
  });

  const payload = await parseResponse<{ data: ServiceChatPayload }>(response);
  return payload.data;
}

export async function sendServiceChatMessage(conversationId: string, message: string) {
  const auth = getMySqlAuth();

  const response = await fetch(`${API_BASE}/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      message,
      visitor_id: getServiceChatVisitorId(),
      sender_name: auth?.user?.name,
    }),
  });

  const payload = await parseResponse<{ data: ServiceChatPayload }>(response);
  return payload.data;
}

export async function listServiceChatMessages(conversationId: string) {
  const query = new URLSearchParams({ visitor_id: getServiceChatVisitorId() });
  const response = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}/messages?${query}`,
    { headers: headers() }
  );

  const payload = await parseResponse<{
    data: {
      conversation: ServiceChatConversation;
      messages: ServiceChatMessage[];
    };
  }>(response);
  return payload.data;
}

export async function listServiceChatConversations() {
  const response = await fetch(`${API_BASE}/conversations`, { headers: headers() });
  const payload = await parseResponse<{ data: ServiceChatConversation[] }>(response);
  return payload.data;
}
