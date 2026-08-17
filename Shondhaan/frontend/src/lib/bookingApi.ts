import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";

export interface BookingRecord {
  id: string;
  user_id: string | number;
  service_id?: string | number | null;
  package_id?: string | number | null;
  service_slug: string;
  service_title: string;
  package_name: string;
  package_price: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  booking_date: string;
  booking_time: string;
  status: string;
  payment_status?: string | null;
  payment_amount?: number | null;
  paid_amount?: number | null;
  service_charge_amount?: number | null;
  platform_fee_amount?: number | null;
  due_amount?: number | null;
  payment_gateway?: string | null;
  payment_order_id?: string | null;
  payment_transaction_id?: string | null;
  payment_verified_at?: string | null;
  provider_id?: string | number | null;
  assigned_to?: string | number | null;
  is_emergency?: boolean;
  created_at: string;
}

export interface CreateBookingPayload {
  user_id: string | number;
  service_id?: string | number | null;
  package_id?: string | number | null;
  service_slug: string;
  service_title: string;
  package_name: string;
  package_price: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  booking_date: string;
  booking_time: string;
  status?: string;
  payment_status?: string;
  platform_fee_amount?: number | null;
  note?: string | null;
  is_emergency?: boolean;
  // [WALLET UPDATE] New fields for wallet payment tracking
  payment_method?: string;
  wallet_cash_used?: number;
  wallet_coins_used?: number;
}

const bookingHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Booking request failed");
  }

  return data as T;
}

export async function createBooking(payload: CreateBookingPayload) {
  const response = await fetch(`${INDIVIDUAL_API_BASE_URL}/api/bookings`, {
    method: "POST",
    headers: bookingHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await parseResponse<{ data: BookingRecord }>(response);
  return data.data;
}

export interface BookingPaymentInit {
  booking: BookingRecord;
  order_id: string;
  customer_order_id?: string;
  amount: number;
  checkout_url: string;
  raw?: unknown;
}

export interface BookingPaymentVerification {
  paid: boolean;
  booking: BookingRecord;
  payment?: unknown;
  raw?: unknown;
}

export const BOOKING_PAYMENT_REF_KEY = "yess:booking-payment-ref";

export interface BookingPaymentRef {
  booking_id: string;
  order_id?: string | null;
  customer_order_id?: string | null;
}

export const saveBookingPaymentRef = (ref: BookingPaymentRef) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(BOOKING_PAYMENT_REF_KEY, JSON.stringify(ref));
  } catch {
    // Payment should continue even when browser storage is unavailable.
  }
};

export const getStoredBookingPaymentRef = (): BookingPaymentRef | null => {
  if (typeof window === "undefined") return null;

  try {
    const value = window.sessionStorage.getItem(BOOKING_PAYMENT_REF_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const clearStoredBookingPaymentRef = () => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(BOOKING_PAYMENT_REF_KEY);
  } catch {
    // Nothing to do.
  }
};

export async function startBookingPayment(id: string | number, totalAmount?: number) {
  const response = await fetch(
    `${INDIVIDUAL_API_BASE_URL}/api/bookings/${encodeURIComponent(String(id))}/payment`,
    {
      method: "POST",
      headers: bookingHeaders(),
      body: totalAmount ? JSON.stringify({ total_amount: totalAmount }) : undefined,
    }
  );

  const data = await parseResponse<{ data: BookingPaymentInit }>(response);
  saveBookingPaymentRef({
    booking_id: String(id),
    order_id: data.data.order_id,
    customer_order_id: data.data.customer_order_id,
  });

  return data.data;
}

export async function verifyBookingPayment(params: {
  booking_id?: string | number | null;
  order_id?: string | number | null;
}) {
  const response = await fetch(`${INDIVIDUAL_API_BASE_URL}/api/bookings/payment/verify`, {
    method: "POST",
    headers: bookingHeaders(),
    body: JSON.stringify(params),
  });

  const data = await parseResponse<{ data: BookingPaymentVerification }>(response);
  return data.data;
}

export async function listBookings(params: {
  user_id?: string | number;
  status?: string;
  service_slug?: string;
  date?: string;
  provider_id?: string | number;
  assigned_to?: string | number;
} = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const url = `${INDIVIDUAL_API_BASE_URL}/api/bookings${query.toString() ? `?${query}` : ""}`;
  const response = await fetch(url, {
    headers: bookingHeaders(),
  });

  const data = await parseResponse<{ data: BookingRecord[] }>(response);
  return data.data;
}

export async function listProviderAssignedBookings(userId: string | number) {
  const response = await fetch(
    `${INDIVIDUAL_API_BASE_URL}/api/bookings/provider/${encodeURIComponent(String(userId))}`,
    { headers: bookingHeaders() }
  );

  const data = await parseResponse<{
    data: BookingRecord[];
    provider?: unknown;
  }>(response);
  return data.data;
}

export async function getBooking(id: string | number) {
  const response = await fetch(
    `${INDIVIDUAL_API_BASE_URL}/api/bookings/${encodeURIComponent(String(id))}`,
    { headers: bookingHeaders() }
  );

  const data = await parseResponse<{ data: BookingRecord }>(response);
  return data.data;
}

export async function updateBookingStatus(
  id: string | number,
  status: string,
  cancel_reason?: string | null
) {
  const response = await fetch(
    `${INDIVIDUAL_API_BASE_URL}/api/bookings/${encodeURIComponent(String(id))}/status`,
    {
      method: "PATCH",
      headers: bookingHeaders(),
      body: JSON.stringify({ status, cancel_reason }),
    }
  );

  const data = await parseResponse<{ data: BookingRecord }>(response);
  return data.data;
}

export async function assignBookingProvider(
  id: string | number,
  provider_id: string | number | null
) {
  const response = await fetch(
    `${INDIVIDUAL_API_BASE_URL}/api/bookings/${encodeURIComponent(String(id))}/assign-provider`,
    {
      method: "PATCH",
      headers: bookingHeaders(),
      body: JSON.stringify({ provider_id }),
    }
  );

  const data = await parseResponse<{ data: BookingRecord }>(response);
  return data.data;
}

export async function updateBookingPaymentStatus(
  id: string | number,
  payment_status: string
) {
  const response = await fetch(
    `${INDIVIDUAL_API_BASE_URL}/api/bookings/${encodeURIComponent(String(id))}/payment-status`,
    {
      method: "PATCH",
      headers: bookingHeaders(),
      body: JSON.stringify({ payment_status }),
    }
  );

  const data = await parseResponse<{ data: BookingRecord }>(response);
  return data.data;
}

export async function deleteBooking(id: string | number) {
  const response = await fetch(
    `${INDIVIDUAL_API_BASE_URL}/api/bookings/${encodeURIComponent(String(id))}`,
    {
      method: "DELETE",
      headers: bookingHeaders(),
    }
  );

  const data = await parseResponse<{ data: { id: string | number } }>(response);
  return data.data;
}
