// utils/shurjopay.js
let cachedToken = null;
let tokenExpiresAt = 0;

// Return the configured base URL for this backend (used to build return/cancel URLs).
function backendBaseUrl() {
  return (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5050}`).replace(/\/+$/, '');
}

// Normalize a ShurjoPay response payload into the "record" we care about.
// ShurjoPay sometimes wraps the meaningful fields inside `data` or an array.
function paymentRecordFrom(payload) {
  if (!payload) return {};
  if (Array.isArray(payload)) return payload[0] || {};
  if (Array.isArray(payload.data)) return payload.data[0] || {};
  if (payload.data && typeof payload.data === "object") return payload.data;
  return payload;
}

// Extract the redirect URL from any ShurjoPay response shape.
function checkoutUrlFrom(data) {
  if (!data) return null;
  const record = paymentRecordFrom(data);
  const candidates = [
    record.checkout_url,
    record.payment_url,
    record.url,
    record.redirect_url,
    record.redirectGatewayURL,
    record.checkoutUrl,
    record.checkoutURL,
    data?.checkout_url,
    data?.payment_url,
    data?.url,
    data?.redirect_url,
    data?.redirectGatewayURL,
    data?.checkoutUrl,
  ];
  const found = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
  return found || null;
}

async function getShurjoPayToken() {
  // Reuse token if still valid (ShurjoPay tokens are typically valid ~30-60 min)
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const res = await fetch(process.env.SURJOPAY_GET_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.SURJOPAY_MERCHANT_NAME,
      password: process.env.SURJOPAY_MERCHANT_PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error(`ShurjoPay token request failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (!data.token) {
    throw new Error("ShurjoPay token response missing 'token' field");
  }

  cachedToken = data.token;
  // token_type/expiry field names vary by ShurjoPay version; fall back to 25 min if not present
  const expiresInSec = data.expires_in || 1500;
  tokenExpiresAt = Date.now() + expiresInSec * 1000 - 30000; // refresh 30s early

  return { token: data.token, store_id: data.store_id, execute_url: data.execute_url };
}

async function initiateShurjoPayCheckout({ amount, orderId, customerName, customerEmail, customerPhone, customerAddress }) {
  const auth = await getShurjoPayToken();

  const returnUrl = process.env.PAYMENT_SUCCESS_REDIRECT_URL || `${backendBaseUrl()}/api/payments/shurjopay/verify/${orderId}`;
  const cancelUrl = process.env.PAYMENT_CANCEL_REDIRECT_URL || `${backendBaseUrl()}/api/payments/shurjopay/cancel/${orderId}`;

  const payload = {
    prefix: process.env.SURJOPAY_MERCHANT_PREFIX,
    token: auth.token,
    store_id: auth.store_id,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    amount: amount,
    order_id: orderId,
    currency: "BDT",
    customer_name: customerName || "Employer",
    customer_address: customerAddress || "N/A",
    customer_email: customerEmail || "noemail@yessjob.com",
    customer_phone: customerPhone || "01700000000",
    customer_city: "Dhaka",
    client_ip: "127.0.0.1",
    value1: orderId,
    value2: "yessjob_package",
  };

  const res = await fetch(process.env.SURJOPAY_SECRETPAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.sp_massage || data?.sp_message || `ShurjoPay secret-pay request failed (HTTP ${res.status})`);
  }

  return data;
}

async function verifyShurjoPayPayment(spOrderId) {
  const auth = await getShurjoPayToken();

  const res = await fetch(process.env.SURJOPAY_VERIFIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ order_id: spOrderId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.sp_massage || data?.sp_message || `ShurjoPay verification failed (HTTP ${res.status})`);
  }

  return data;
}

module.exports = { getShurjoPayToken, initiateShurjoPayCheckout, verifyShurjoPayPayment, checkoutUrlFrom, paymentRecordFrom };
