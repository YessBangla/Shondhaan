import { pool } from "../config/db.js";

const REQUIRED_ENV = [
  "SURJOPAY_MERCHANT_NAME",
  "SURJOPAY_MERCHANT_PASSWORD",
  "SURJOPAY_MERCHANT_PREFIX",
  "SURJOPAY_GET_TOKEN_URL",
  "SURJOPAY_SECRETPAY_URL",
  "SURJOPAY_VERIFIC_URL",
];

const money = (value) => Math.round(Number(value || 0) * 100) / 100;

const appendQuery = (url, params) => {
  const parsed = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      parsed.searchParams.set(key, String(value));
    }
  });
  return parsed.toString();
};

const serviceBackendBaseUrl = (req) =>
  (process.env.YESS_SERVICE_BACKEND_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");

const frontendUrl = (key, fallbackPath, params = {}) =>
  appendQuery(process.env[key] || `${process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || ""}${fallbackPath}`, params);

const requireConfig = () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing Shurjopay env: ${missing.join(", ")}`);
  }
};

const shurjopayRequest = async (url, body, token) => {
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

  if (!response.ok) {
    throw new Error(data?.message || data?.sp_massage || data?.sp_message || "Shurjopay request failed");
  }

  return data;
};

const getToken = async () => {
  const data = await shurjopayRequest(process.env.SURJOPAY_GET_TOKEN_URL, {
    username: process.env.SURJOPAY_MERCHANT_NAME,
    password: process.env.SURJOPAY_MERCHANT_PASSWORD,
  });

  if (!data?.token) {
    throw new Error(data?.message || "Shurjopay token was not returned");
  }

  return data;
};

const checkoutUrlFrom = (data) =>
  data?.checkout_url ||
  data?.payment_url ||
  data?.url ||
  data?.redirect_url ||
  data?.checkoutUrl ||
  null;

const gatewayOrderIdFrom = (data, fallback) =>
  data?.sp_order_id ||
  data?.order_id ||
  data?.shurjopay_order_id ||
  data?.id ||
  fallback;

const paymentRecordFrom = (payload) => {
  if (Array.isArray(payload)) return payload[0] || {};
  if (Array.isArray(payload?.data)) return payload.data[0] || {};
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload || {};
};

const isSuccessfulPayment = (record) => {
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
};

const transactionIdFrom = (record) =>
  record?.sp_trxn_id ||
  record?.transaction_id ||
  record?.bank_trx_id ||
  record?.bank_trxn_id ||
  record?.invoice_no ||
  null;

const parsePaymentPayload = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const normalizeLookupValue = (value) => {
  if (Array.isArray(value)) return value[0] ?? null;
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const getBooking = async (id) => {
  const [rows] = await pool.execute(
    `
    SELECT *
    FROM bookings
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );
  return rows[0] || null;
};

const getBookingByPaymentRef = async ({ bookingId, orderId, lookupValues = [] }) => {
  const candidates = Array.from(
    new Set(
      [bookingId, orderId, ...lookupValues]
        .map(normalizeLookupValue)
        .filter(Boolean)
    )
  );

  for (const candidate of candidates) {
    const booking = await getBooking(candidate);
    if (booking) return booking;
  }

  for (const candidate of candidates) {
    const escapedCandidate = String(candidate).replace(/'/g, "''");
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE payment_order_id = ?
         OR payment_payload LIKE ?
         OR payment_payload LIKE ?
         OR payment_payload LIKE ?
         OR payment_payload LIKE ?
         OR payment_payload LIKE ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [
        candidate,
        `%"customer_order_id":"${escapedCandidate}"%`,
        `%"gateway_order_id":"${escapedCandidate}"%`,
        `%"sp_order_id":"${escapedCandidate}"%`,
        `%"order_id":"${escapedCandidate}"%`,
        `%"invoice_no":"${escapedCandidate}"%`,
      ]
    );

    if (rows[0]) return rows[0];
  }

  return null;
};

const verifyShurjopayBooking = async ({ booking, orderId }) => {
  const requestedOrderId = orderId;
  const primaryOrderId = booking.payment_order_id || orderId;

  if (!primaryOrderId) {
    throw new Error("Payment order id is required");
  }

  const tokenData = await getToken();
  const orderIdsToTry = Array.from(
    new Set([primaryOrderId, requestedOrderId].filter(Boolean).map(String))
  );
  let verificationResponse = null;
  let verifiedOrderId = primaryOrderId;

  for (const candidateOrderId of orderIdsToTry) {
    const response = await shurjopayRequest(
      process.env.SURJOPAY_VERIFIC_URL,
      { order_id: candidateOrderId },
      tokenData.token
    );
    const candidateRecord = paymentRecordFrom(response);

    verificationResponse = response;
    verifiedOrderId = candidateOrderId;

    if (isSuccessfulPayment(candidateRecord) || String(candidateRecord?.sp_code || "") !== "1011") {
      break;
    }
  }

  const record = paymentRecordFrom(verificationResponse);
  const paid = isSuccessfulPayment(record);
  const transactionId = transactionIdFrom(record);
  const payload = JSON.stringify({
    ...parsePaymentPayload(booking.payment_payload),
    verified: verificationResponse,
    verified_order_id: verifiedOrderId,
  });

  await pool.execute(
    `
    UPDATE bookings
    SET payment_status = ?,
        payment_gateway = COALESCE(payment_gateway, 'shurjopay'),
        payment_order_id = ?,
        payment_transaction_id = ?,
        payment_verified_at = ${paid ? "NOW()" : "payment_verified_at"},
        payment_payload = ?
    WHERE id = ?
    `,
    [paid ? "paid" : "unpaid", verifiedOrderId, transactionId, payload, booking.id]
  );

  const updated = await getBooking(booking.id);

  return {
    paid,
    booking: updated,
    payment: record,
    raw: verificationResponse,
  };
};

export const initiateBookingPayment = async (req, res) => {
  try {
    requireConfig();

    const { id } = req.params;
    const booking = await getBooking(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const declaredTotal = Number(req.body?.total_amount || 0);
    const payableAmount = money(
      booking.platform_fee_amount ??
        booking.payment_amount ??
        (Number.isFinite(declaredTotal) ? declaredTotal : 0)
    );

    if (payableAmount <= 0) {
      return res.status(400).json({ message: "Platform fee is not payable" });
    }

    const tokenData = await getToken();
    const prefix = process.env.SURJOPAY_MERCHANT_PREFIX;
    const customerOrderId = `${prefix}${Date.now()}${String(booking.id).replace(/-/g, "").slice(0, 10)}`;

    const returnUrl = appendQuery(`${serviceBackendBaseUrl(req)}/api/bookings/payment/return`, {
      booking_id: booking.id,
      order_id: customerOrderId,
    });
    const cancelUrl = appendQuery(`${serviceBackendBaseUrl(req)}/api/bookings/payment/cancel`, {
      booking_id: booking.id,
    });

    const paymentPayload = {
      prefix,
      token: tokenData.token,
      store_id: tokenData.store_id,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      amount: payableAmount,
      order_id: customerOrderId,
      currency: "BDT",
      customer_name: booking.customer_name,
      customer_address: booking.customer_address,
      customer_phone: booking.customer_phone,
      customer_city: "Dhaka",
      client_ip: req.ip || req.socket?.remoteAddress || "127.0.0.1",
      value1: booking.id,
      value2: "service_booking",
      value3: money(booking.package_price || 0),
      value4: payableAmount,
    };

    const paymentResponse = await shurjopayRequest(
      process.env.SURJOPAY_SECRETPAY_URL,
      paymentPayload,
      tokenData.token
    );

    const paymentRecord = paymentRecordFrom(paymentResponse);
    const checkoutUrl = checkoutUrlFrom(paymentRecord) || checkoutUrlFrom(paymentResponse);
    const gatewayOrderId = gatewayOrderIdFrom(paymentRecord, customerOrderId);

    if (!checkoutUrl) {
      throw new Error(paymentResponse?.message || "Shurjopay checkout URL was not returned");
    }

    await pool.execute(
      `
      UPDATE bookings
      SET payment_gateway = ?,
          payment_order_id = ?,
          payment_amount = ?,
          payment_payload = ?,
          payment_status = 'unpaid'
      WHERE id = ?
      `,
      [
        "shurjopay",
        gatewayOrderId,
        payableAmount,
        JSON.stringify({
          initiated: paymentResponse,
          customer_order_id: customerOrderId,
          gateway_order_id: gatewayOrderId,
        }),
        booking.id,
      ]
    );

    return res.json({
      message: "Payment initiated",
      data: {
        booking: {
          ...booking,
          payment_gateway: "shurjopay",
          payment_order_id: gatewayOrderId,
          payment_amount: payableAmount,
          payment_status: "unpaid",
        },
        order_id: gatewayOrderId,
        customer_order_id: customerOrderId,
        amount: payableAmount,
        checkout_url: checkoutUrl,
        raw: paymentResponse,
      },
    });
  } catch (error) {
    console.error("Initiate Shurjopay payment error:", error);

    return res.status(500).json({
      message: error.message || "Failed to initiate payment",
    });
  }
};

export const verifyBookingPayment = async (req, res) => {
  try {
    requireConfig();

    const bookingId = req.body.booking_id || req.query.booking_id || req.body.bookingId || req.query.bookingId;
    let orderId =
      req.body.order_id ||
      req.query.order_id ||
      req.body.orderId ||
      req.query.orderId ||
      req.body.sp_order_id ||
      req.query.sp_order_id;
    const lookupValues = Object.values({ ...req.body, ...req.query })
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map(normalizeLookupValue)
      .filter(Boolean);

    const booking = await getBookingByPaymentRef({ bookingId, orderId, lookupValues });

    if (!booking) {
      return res.status(404).json({ message: "Booking payment not found" });
    }

    const result = await verifyShurjopayBooking({ booking, orderId });

    return res.json({
      message: result.paid ? "Payment verified" : "Payment is not completed",
      data: result,
    });
  } catch (error) {
    console.error("Verify Shurjopay payment error:", error);

    return res.status(500).json({
      message: error.message || "Failed to verify payment",
    });
  }
};

export const handleBookingPaymentReturn = async (req, res) => {
  try {
    requireConfig();

    const bookingId = req.query.booking_id || req.query.bookingId || req.query.value1;
    const orderId =
      req.query.order_id ||
      req.query.orderId ||
      req.query.sp_order_id ||
      req.query.invoice_no;
    const lookupValues = Object.values(req.query)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map(normalizeLookupValue)
      .filter(Boolean);

    const booking = await getBookingByPaymentRef({ bookingId, orderId, lookupValues });

    if (!booking) {
      return res.redirect(frontendUrl("PAYMENT_FAILED_REDIRECT_URL", "/payment-failed", {
        message: "booking_not_found",
      }));
    }

    const result = await verifyShurjopayBooking({ booking, orderId });
    const target = result.paid ? "PAYMENT_SUCCESS_REDIRECT_URL" : "PAYMENT_FAILED_REDIRECT_URL";
    const path = result.paid ? "/payment-success" : "/payment-failed";

    return res.redirect(frontendUrl(target, path, {
      booking_id: booking.id,
      order_id: result.booking.payment_order_id,
      verified: result.paid ? "1" : "0",
    }));
  } catch (error) {
    console.error("Shurjopay return handling error:", error);

    return res.redirect(frontendUrl("PAYMENT_FAILED_REDIRECT_URL", "/payment-failed", {
      message: "verification_error",
    }));
  }
};

export const handleBookingPaymentCancel = async (req, res) => {
  const bookingId = req.query.booking_id || req.query.bookingId || req.query.value1;
  const orderId =
    req.query.order_id ||
    req.query.orderId ||
    req.query.sp_order_id ||
    req.query.invoice_no;

  return res.redirect(frontendUrl("PAYMENT_CANCEL_REDIRECT_URL", "/payment-cancel", {
    booking_id: bookingId,
    order_id: orderId,
  }));
};

export const reconcilePendingShurjopayPayments = async () => {
  try {
    requireConfig();

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE payment_gateway = 'shurjopay'
        AND payment_status = 'unpaid'
        AND payment_order_id IS NOT NULL
        AND payment_order_id <> ''
        AND created_at >= DATE_SUB(NOW(), INTERVAL 2 DAY)
      ORDER BY created_at DESC
      LIMIT 20
      `
    );

    for (const booking of rows) {
      try {
        const result = await verifyShurjopayBooking({
          booking,
          orderId: booking.payment_order_id,
        });

        if (result.paid) {
          console.log(`Reconciled paid Shurjopay booking ${booking.id}`);
        }
      } catch (error) {
        console.warn(`Pending Shurjopay reconcile skipped for ${booking.id}:`, error.message);
      }
    }
  } catch (error) {
    console.warn("Shurjopay reconciliation unavailable:", error.message);
  }
};
