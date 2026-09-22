import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";

export interface ServiceChatConversation {
  id: string;
  visitor_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  user_avatar?: string | null;
  profile_image?: string | null;
  avatar_url?: string | null;
  user_profile_image?: string | null;
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
  automatic_reply?: ServiceChatMessage | null;
}

const API_BASE = `${INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "")}/api/service-chat`;
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
  if (!response.ok) {
    const msg = data?.message || "Service chat request failed";
    const err = new Error(msg) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return data as T;
}

export async function createServiceChatConversation(message: string) {
  const auth = getMySqlAuth();
  const user = auth?.user;

  const response = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: headers(),
    credentials: "include",
    body: JSON.stringify({
      message,
      visitor_id: getServiceChatVisitorId(),
      user_name: user?.name,
      user_email: user?.email,
      user_phone: user?.mobile,
      user_avatar: user?.profile_image || user?.avatar_url,
      profile_image: user?.profile_image || user?.avatar_url,
      user_profile_image: user?.profile_image || user?.avatar_url,
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
    credentials: "include",
    body: JSON.stringify({
      message,
      visitor_id: getServiceChatVisitorId(),
      sender_name: auth?.user?.name,
      user_name: auth?.user?.name,
      user_email: auth?.user?.email,
      user_phone: auth?.user?.mobile,
      user_avatar: auth?.user?.profile_image || auth?.user?.avatar_url,
      profile_image: auth?.user?.profile_image || auth?.user?.avatar_url,
      user_profile_image: auth?.user?.profile_image || auth?.user?.avatar_url,
    }),
  });

  const payload = await parseResponse<{ data: ServiceChatPayload }>(response);
  return payload.data;
}

export async function listServiceChatMessages(conversationId: string) {
  const query = new URLSearchParams({ visitor_id: getServiceChatVisitorId() });
  const response = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}/messages?${query}`,
    {
      headers: headers(),
      credentials: "include",
    }
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
  const query = new URLSearchParams({ visitor_id: getServiceChatVisitorId() });
  const response = await fetch(`${API_BASE}/conversations?${query}`, {
    headers: headers(),
    credentials: "include",
  });

  const payload = await parseResponse<{ data: ServiceChatConversation[] }>(response);
  return payload.data;
}

// Debug helper — call once from browser console:
// import { debugServiceChatAuth } from "@/lib/serviceChatApi";
// debugServiceChatAuth();
export async function debugServiceChatAuth() {
  const auth = getMySqlAuth();
  console.table({
    hasToken: !!auth?.token,
    tokenPrefix: auth?.token?.slice(0, 20) + "...",
    userId: auth?.user?.id,
    userType: auth?.user?.type,
    apiBase: API_BASE,
  });

  try {
    const res = await fetch(`${API_BASE}/conversations`, {
      headers: headers(),
      credentials: "include",
    });
    console.log("Status:", res.status, res.statusText);
    const body = await res.json().catch(() => null);
    console.log("Response body:", body);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
