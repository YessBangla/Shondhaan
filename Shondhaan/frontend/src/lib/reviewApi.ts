import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";

export interface ServiceReview {
  id: string;
  service_slug: string;
  user_id: string | null;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface CreateReviewPayload {
  service_slug: string;
  user_id?: string | number | null;
  reviewer_name: string;
  rating: number;
  comment?: string | null;
}

const reviewHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Review request failed");
  }

  return data as T;
}

export async function listReviews(params: {
  service_slug?: string;
  user_id?: string | number;
} = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const response = await fetch(
    `${INDIVIDUAL_API_BASE_URL}/api/reviews${query.toString() ? `?${query}` : ""}`,
    { headers: reviewHeaders() }
  );

  const data = await parseResponse<{ data: ServiceReview[] }>(response);
  return data.data;
}

export async function listServiceReviews(serviceSlug: string) {
  const response = await fetch(
    `${INDIVIDUAL_API_BASE_URL}/api/reviews/service/${encodeURIComponent(serviceSlug)}`,
    { headers: reviewHeaders() }
  );

  const data = await parseResponse<{ data: ServiceReview[] }>(response);
  return data.data;
}

export async function createReview(payload: CreateReviewPayload) {
  const response = await fetch(`${INDIVIDUAL_API_BASE_URL}/api/reviews`, {
    method: "POST",
    headers: reviewHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await parseResponse<{ data: ServiceReview }>(response);
  return data.data;
}

export async function deleteReview(id: string | number) {
  const response = await fetch(
    `${INDIVIDUAL_API_BASE_URL}/api/reviews/${encodeURIComponent(String(id))}`,
    {
      method: "DELETE",
      headers: reviewHeaders(),
    }
  );

  const data = await parseResponse<{ data: { id: string; service_slug: string } }>(response);
  return data.data;
}
