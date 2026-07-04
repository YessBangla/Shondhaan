export interface MartSellerNotification {
  id: string;
  user_id: string;
  product_id?: string | number | null;
  title: string;
  message: string;
  type: string;
  action_url?: string | null;
  is_read: boolean;
  created_at: string;
}

const STORAGE_KEY = "yess_mart_seller_notifications";
const MART_API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8081";

function readAll(): MartSellerNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as MartSellerNotification[] : [];
  } catch {
    return [];
  }
}

function writeAll(items: MartSellerNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("yess-mart-seller-notifications-changed"));
}

function normalizeNotification(item: any): MartSellerNotification {
  return {
    ...item,
    id: String(item.id),
    user_id: String(item.user_id),
    product_id:
      item.product_id ??
      item.productId ??
      item.metadata?.product_id ??
      item.metadata?.productId ??
      null,
    action_url:
      item.action_url ||
      item.actionUrl ||
      item.url ||
      item.link ||
      item.metadata?.action_url ||
      item.metadata?.url ||
      null,
    is_read: Boolean(item.is_read),
    created_at: item.created_at || new Date().toISOString(),
  };
}

function mergeRemoteWithLocal(remoteItems: MartSellerNotification[], userId: string | number) {
  const localItems = listMartSellerNotifications(userId);
  const localById = new Map(localItems.map((item) => [String(item.id), item]));

  const mergedRemote = remoteItems.map((remote) => {
    const localMatch =
      localById.get(String(remote.id)) ||
      localItems.find((local) =>
        local.type === remote.type &&
        local.title === remote.title &&
        local.message === remote.message &&
        Math.abs(new Date(local.created_at).getTime() - new Date(remote.created_at).getTime()) < 5 * 60 * 1000
      );

    return {
      ...remote,
      action_url: remote.action_url || localMatch?.action_url || null,
    };
  });

  const remoteKeys = new Set(mergedRemote.map((item) => String(item.id)));
  const localOnly = localItems.filter((local) => {
    if (remoteKeys.has(String(local.id))) return false;
    return !mergedRemote.some((remote) =>
      local.type === remote.type &&
      local.title === remote.title &&
      local.message === remote.message &&
      Math.abs(new Date(local.created_at).getTime() - new Date(remote.created_at).getTime()) < 5 * 60 * 1000
    );
  });
  return [...mergedRemote, ...localOnly]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 100);
}

export function isNumericMartUserId(userId: unknown) {
  return userId != null && /^\d+$/.test(String(userId));
}

export function listMartSellerNotifications(userId: string | number) {
  const id = String(userId);
  return readAll()
    .filter((item) => String(item.user_id) === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function fetchMartSellerNotifications(userId: string | number) {
  try {
    const res = await fetch(`${MART_API_BASE}/api/notifications?user_id=${encodeURIComponent(String(userId))}`);
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false && Array.isArray(json.data)) {
      return mergeRemoteWithLocal(json.data.map(normalizeNotification), userId);
    }
  } catch {
    // Fall back to the local queue if the Mart API does not expose notifications yet.
  }

  return listMartSellerNotifications(userId);
}

export function pushMartSellerNotification(input: {
  userId: string | number;
  title: string;
  message: string;
  type: string;
  productId?: string | number | null;
  actionUrl?: string | null;
}) {
  const item: MartSellerNotification = {
    id: `mart-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    user_id: String(input.userId),
    product_id: input.productId ?? null,
    title: input.title,
    message: input.message,
    type: input.type,
    action_url: input.actionUrl || null,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  writeAll([item, ...readAll()].slice(0, 100));
  return item;
}

export async function createMartSellerNotification(input: {
  userId: string | number;
  title: string;
  message: string;
  type: string;
  productId?: string | number | null;
  actionUrl?: string | null;
}) {
  const localItem = pushMartSellerNotification(input);

  try {
    const res = await fetch(`${MART_API_BASE}/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        product_id: input.productId ?? null,
        productId: input.productId ?? null,
        action_url: input.actionUrl || null,
        actionUrl: input.actionUrl || null,
        url: input.actionUrl || null,
        metadata: {
          product_id: input.productId ?? null,
          action_url: input.actionUrl || null,
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) {
      window.dispatchEvent(new Event("yess-mart-seller-notifications-changed"));
      return json.data ? normalizeNotification(json.data) : localItem;
    }
  } catch {
    // Fall back below.
  }

  return localItem;
}

export function markMartSellerNotificationRead(id: string) {
  writeAll(readAll().map((item) => item.id === id ? { ...item, is_read: true } : item));
}

export async function markMartSellerNotificationReadRemote(id: string, userId: string | number) {
  try {
    await fetch(`${MART_API_BASE}/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
  } catch {
    // Local fallback below.
  }

  markMartSellerNotificationRead(id);
}

export function markAllMartSellerNotificationsRead(userId: string | number) {
  const id = String(userId);
  writeAll(readAll().map((item) => String(item.user_id) === id ? { ...item, is_read: true } : item));
}

export async function markAllMartSellerNotificationsReadRemote(userId: string | number) {
  try {
    await fetch(`${MART_API_BASE}/api/notifications/read-all`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
  } catch {
    // Local fallback below.
  }

  markAllMartSellerNotificationsRead(userId);
}
