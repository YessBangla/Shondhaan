// utils/shurjopay.js
//
// ShurjoPay integration helpers for the yessjob backend.
//
// Required env vars (set in yessjob_backend/.env):
//   SURJOPAY_MERCHANT_NAME     e.g. your sandbox username
//   SURJOPAY_MERCHANT_PASSWORD e.g. your sandbox password
//   SURJOPAY_MERCHANT_PREFIX   e.g. SP
//   SURJOPAY_GET_TOKEN_URL     e.g. https://sandbox.shurjopayment.com/api/get_token
//   SURJOPAY_SECRETPAY_URL     e.g. https://sandbox.shurjopayment.com/api/secret-pay
//   SURJOPAY_VERIFIC_URL       e.g. https://sandbox.shurjopayment.com/api/verification
//   BACKEND_URL   public base URL used for return_url/cancel_url

const REQUIRED_ENV = [
  "SURJOPAY_MERCHANT_NAME",
  "SURJOPAY_MERCHANT_PASSWORD",
  "SURJOPAY_MERCHANT_PREFIX",
  "SURJOPAY_GET_TOKEN_URL",
  "SURJOPAY_SECRETPAY_URL",
  "SURJOPAY_VERIFIC_URL",
];

// Set SHURJOPAY_DEBUG=true in .env to log every request/response.
// Turn this OFF once things are working — it logs full payloads.
const DEBUG = String(process.env.SHURJOPAY_DEBUG || "").toLowerCase() === "true";

const money = (value) => Math.round(Number(value || 0) * 100) / 100;

function requireConfig() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing Shurjopay env: ${missing.join(", ")}`);
  }
}

async function shurjopayRequest(url, body, token, label = "request") {
  if (!url) {
    throw new Error(`Shurjopay ${label} failed: target URL is not set (check your .env)`);
  }

  if (DEBUG) {
    const redactedBody = { ...body };
    if (redactedBody.password) redactedBody.password = "[REDACTED]";
    console.log(`=== ShurjoPay ${label} → ${url} ===`);
    console.log(JSON.stringify(redactedBody, null, 2));
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (DEBUG) {
    console.log(`=== ShurjoPay ${label} response (HTTP ${response.status}) ===`);
    console.log(JSON.stringify(data, null, 2));
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.sp_massage || data?.sp_message || `Shurjopay ${label} failed (HTTP ${response.status})`
    );
  }

  return data;
}

async function getToken() {
  requireConfig();

  const data = await shurjopayRequest(
    process.env.SURJOPAY_GET_TOKEN_URL,
    {
      username: process.env.SURJOPAY_MERCHANT_NAME,
      password: process.env.SURJOPAY_MERCHANT_PASSWORD,
    },
    null,
    "get_token"
  );

  if (!data?.token) {
    // ShurjoPay returned HTTP 200 but no token — surface whatever message it gave.
    throw new Error(data?.message || data?.sp_message || "Shurjopay token was not returned in response");
  }

  return data;
}

function checkoutUrlFrom(data) {
  return (
    data?.checkout_url ||
    data?.payment_url ||
    data?.url ||
    data?.redirect_url ||
    data?.checkoutUrl ||
    null
  );
}

function paymentRecordFrom(payload) {
  if (Array.isArray(payload)) return payload[0] || {};
  if (Array.isArray(payload?.data)) return payload.data[0] || {};
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload || {};
}

function gatewayOrderIdFrom(data, fallback) {
  return (
    data?.sp_order_id ||
    data?.order_id ||
    data?.shurjopay_order_id ||
    data?.id ||
    fallback
  );
}

function isSuccessfulPayment(record) {
  const values = [
    record?.sp_code,
    record?.bank_status,
    record?.transaction_status,
    record?.payment_status,
    record?.status,
    record?.is_success,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toLowerCase());

  return values.some((value) =>
    ["1000", "success", "successful", "paid", "complete", "completed", "true"].includes(value)
  );
}

/**
 * Initiate a ShurjoPay checkout session for a job package.
 */
async function initiateShurjoPayCheckout({
  amount,
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  packageId,
  returnUrl,
  cancelUrl,
}) {
  requireConfig();

  if (!orderId) throw new Error("initiateShurjoPayCheckout: orderId is required");
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    throw new Error("initiateShurjoPayCheckout: amount must be a number");
  }

  const tokenData = await getToken();
  const prefix = process.env.SURJOPAY_MERCHANT_PREFIX;
  const customerOrderId = `${prefix}${orderId}`;

  const base = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
  const finalReturnUrl = returnUrl || `${base}/api/payments/shurjopay/verify/${encodeURIComponent(orderId)}`;
  const finalCancelUrl = cancelUrl || `${base}/api/payments/shurjopay/cancel/${encodeURIComponent(orderId)}`;

  const paymentPayload = {
    prefix,
    token: tokenData.token,
    store_id: tokenData.store_id,
    return_url: finalReturnUrl,
    cancel_url: finalCancelUrl,
    amount: money(amount),
    order_id: customerOrderId,
    currency: "BDT",
    customer_name: customerName || "Employer",
    customer_address: "Dhaka",
    customer_phone: customerPhone || "01700000000",
    customer_city: "Dhaka",
    customer_email: customerEmail || "",
    client_ip: "127.0.0.1",
    value1: packageId ? String(packageId) : "",
    value2: "job_package",
    value3: money(amount),
    value4: money(amount),
  };

  const paymentResponse = await shurjopayRequest(
    process.env.SURJOPAY_SECRETPAY_URL,
    paymentPayload,
    tokenData.token,
    "secret-pay"
  );

  const paymentRecord = paymentRecordFrom(paymentResponse);
  const checkoutUrl = checkoutUrlFrom(paymentRecord) || checkoutUrlFrom(paymentResponse);
  const gatewayOrderId = gatewayOrderIdFrom(paymentRecord, customerOrderId);

  if (!checkoutUrl) {
    throw new Error(paymentResponse?.message || "Shurjopay checkout URL was not returned");
  }

  return {
    ...paymentResponse,
    checkout_url: checkoutUrl,
    sp_order_id: gatewayOrderId,
    customer_order_id: customerOrderId,
  };
}

/**
 * Verify a ShurjoPay payment by order id.
 */
async function verifyShurjoPayPayment(orderId) {
  requireConfig();

  if (!orderId) throw new Error("verifyShurjoPayPayment: orderId is required");

  const tokenData = await getToken();
  const response = await shurjopayRequest(
    process.env.SURJOPAY_VERIFIC_URL,
    { order_id: orderId },
    tokenData.token,
    "verification"
  );

  return response;
}

module.exports = {
  initiateShurjoPayCheckout,
  verifyShurjoPayPayment,
  checkoutUrlFrom,
  paymentRecordFrom,
  gatewayOrderIdFrom,
  isSuccessfulPayment,
  getToken,
  requireConfig,
};
