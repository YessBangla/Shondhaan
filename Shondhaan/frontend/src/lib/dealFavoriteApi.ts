const DEAL_API_BASE_URL = (
  import.meta.env.VITE_DEAL_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "");

const parsePayload = async (response: Response) => {
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.error || "Deal favorite request failed");
  }

  return payload;
};

export const getDealAuthUserId = (user: any) =>
  String(
    user?.id ||
      user?.user_id ||
      user?.user?.id ||
      user?.user?.user_id ||
      ""
  );

export const getDealFavoriteStatus = async (
  userId: string,
  listingId: string
): Promise<boolean> => {
  const params = new URLSearchParams({ user_id: userId });
  const response = await fetch(
    `${DEAL_API_BASE_URL}/api/deal/favorites/${listingId}?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const payload = await parsePayload(response);
  return Boolean(payload?.data?.is_favorite);
};

export const addDealFavorite = async (userId: string, listingId: string) => {
  const response = await fetch(`${DEAL_API_BASE_URL}/api/deal/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ user_id: userId, listing_id: listingId }),
  });

  await parsePayload(response);
};

export const removeDealFavorite = async (
  userId: string,
  listingId: string
) => {
  const response = await fetch(
    `${DEAL_API_BASE_URL}/api/deal/favorites/${listingId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ user_id: userId }),
    }
  );

  await parsePayload(response);
};

export const listDealFavorites = async (userId: string) => {
  const params = new URLSearchParams({ user_id: userId });
  const response = await fetch(
    `${DEAL_API_BASE_URL}/api/deal/favorites?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const payload = await parsePayload(response);
  return Array.isArray(payload?.data) ? payload.data : [];
};
