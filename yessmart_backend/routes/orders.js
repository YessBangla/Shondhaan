const express = require("express");
const axios = require("axios");
const pool = require("../db");
const { generateInvoiceNumber } = require("../utils/invoiceNumber");
const { getBackendBaseUrl } = require("../utils/baseUrl");

const router = express.Router();

const normalizeCouponCode = (code) => String(code || "").trim().toUpperCase();

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const calculateCouponDiscount = (coupon, subtotal) => {
  const eligibleSubtotal = Number(subtotal || 0);
  const discountValue = Number(coupon.discount_value || 0);
  let discount = coupon.discount_type === "percentage"
    ? Math.round((eligibleSubtotal * discountValue) / 100)
    : discountValue;

  const maxDiscount = toNumberOrNull(coupon.max_discount_amount);
  if (coupon.discount_type === "percentage" && maxDiscount !== null) {
    discount = Math.min(discount, maxDiscount);
  }

  return Math.max(0, Math.min(Math.round(discount), Math.round(eligibleSubtotal)));
};

const getCouponEligibleSubtotal = async (conn, coupon, items) => {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      product_id: Number(item.product_id),
      quantity: Math.max(0, Number(item.quantity || 0)),
      unit_price: Math.max(0, Number(item.unit_price || 0)),
    }))
    .filter((item) => Number.isInteger(item.product_id) && item.product_id > 0 && item.quantity > 0);

  if (normalizedItems.length === 0) return 0;

  const productIds = [...new Set(normalizedItems.map((item) => item.product_id))];
  const [products] = await conn.query(
    `SELECT id, seller_id, sale_price FROM products WHERE id IN (?)`,
    [productIds]
  );
  const productMap = new Map(products.map((product) => [Number(product.id), product]));
  const couponSellerId = toNumberOrNull(coupon.seller_id);

  return normalizedItems.reduce((sum, item) => {
    const product = productMap.get(item.product_id);
    if (!product) return sum;
    if (couponSellerId !== null && Number(product.seller_id) !== couponSellerId) return sum;

    const price = Number(product.sale_price || item.unit_price || 0);
    return sum + price * item.quantity;
  }, 0);
};

const getSslCommerzConfig = () => {
  const isLive = String(process.env.SSLCOMMERZ_IS_LIVE || "").toLowerCase() === "true";
  const storeId = process.env.SSLCOMMERZ_STORE_ID || (!isLive ? "testbox" : "");
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD || process.env.SSLCOMMERZ_STORE_PASSWD || (!isLive ? "qwerty" : "");
  const backendUrl = getBackendBaseUrl();
  const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || "";

  return {
    storeId,
    storePassword,
    isLive,
    backendUrl: backendUrl.replace(/\/$/, ""),
    frontendUrl: frontendUrl.replace(/\/$/, ""),
    initUrl: isLive
      ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
      : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
    validationUrl: isLive
      ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
      : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php",
  };
};

const buildSslCommerzReturnUrl = (status) => {
  const { backendUrl } = getSslCommerzConfig();
  return `${backendUrl}/api/orders/sslcommerz/${status}`;
};

const encodeGatewayPayload = (payload = {}) =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const buildCheckoutRedirectUrl = (paymentStatus, orderId, payload = {}) => {
  const { frontendUrl } = getSslCommerzConfig();
  const params = new URLSearchParams({ payment: paymentStatus });
  if (orderId) params.set("order_id", String(orderId));
  if (payload && Object.keys(payload).length > 0) {
    params.set("gateway_payload", encodeGatewayPayload(payload));
  }

  return `${frontendUrl}/mart/checkout?${params.toString()}`;
};

const extractSslOrderId = (body = {}) => {
  const valueA = Number(body.value_a);
  if (Number.isInteger(valueA) && valueA > 0) return valueA;

  const match = String(body.tran_id || body.tran_id_value || body.transaction_id || "").match(/^MRT-(\d+)-/);
  return match ? Number(match[1]) : null;
};

const validateSslCommerzPayment = async (valId) => {
  const { storeId, storePassword, validationUrl } = getSslCommerzConfig();
  if (!valId) return null;

  const response = await axios.get(validationUrl, {
    params: {
      val_id: valId,
      store_id: storeId,
      store_passwd: storePassword,
      v: 1,
      format: "json",
    },
    timeout: 15000,
  });

  return response.data;
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value || null);
  } catch {
    return JSON.stringify({ error: "Could not serialize payload" });
  }
};

// The customer wallet is owned by the main Shondhaan backend, not the Mart
// database.  Keep that boundary explicit and use the wallet ledger's
// reference_id as the idempotency key.
const walletApiBaseUrl = () => String(process.env.WALLET_API_BASE_URL || process.env.CENTRAL_API_BASE_URL || "").replace(/\/$/, "");

const getMartRewardCoins = async (amount) => {
  const [rows] = await pool.query(
    `SELECT reward_type, reward_value
     FROM mart_reward_rules
    WHERE is_active = 1 AND min_purchase_amount <= ?
     ORDER BY min_purchase_amount DESC LIMIT 1`,
    [amount]
  );

  const rule = rows[0];
  if (!rule) return 0;

  // reward_value is the number of coins to credit once the minimum is met.
  const reward = Number(rule.reward_value);
  return Number.isFinite(reward) && reward > 0 ? Number(reward.toFixed(2)) : 0;
};

const awardMartReward = async ({ userId, orderNumber, amount }) => {
  const rewardCoins = await getMartRewardCoins(amount);
  if (!rewardCoins) return null;

  try {
    const response = await axios.post(
      `${walletApiBaseUrl()}/api/wallet/credit-purchase-reward`,
      {
        user_id: userId,
        purchase_amount: amount,
        reward_coins: rewardCoins,
        module: "MART",
        reference_id: `mart-reward-${orderNumber}`,
        description: `Mart reward for order ${orderNumber}`,
      },
      { timeout: 15000 }
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) return error.response.data;
    throw new Error(error.response?.data?.message || error.message || "Mart reward credit failed");
  }
};

const debitMainWallet = async ({ userId, amount, referenceId, description }) => {
  try {
    const response = await axios.post(
      `${walletApiBaseUrl()}/api/wallet/debit`,
      {
        user_id: userId,
        amount_cash: amount,
        amount_coins: 0,
        module: "MART_ORDER",
        reference_id: referenceId,
        description,
      },
      { timeout: 15000 }
    );
    if (!response.data?.success) throw new Error(response.data?.message || "Wallet payment failed");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || "Wallet payment failed");
  }
};

const saveWalletTransaction = async ({ order, transactionId }) => {
  await pool.query(
    `INSERT INTO \`transaction\` (
       order_id, order_number, user_id, gateway, payment_method, transaction_id,
       amount, currency, gateway_status, payment_status, init_response
     ) VALUES (?, ?, ?, 'wallet', 'wallet', ?, ?, 'BDT', 'completed', 'paid', ?)
     ON DUPLICATE KEY UPDATE gateway_status = 'completed', payment_status = 'paid',
       init_response = VALUES(init_response)`,
    [
      order.id,
      order.order_number,
      order.user_id,
      transactionId,
      Number(order.total || 0),
      safeJsonStringify({ wallet_transaction_id: transactionId }),
    ]
  );
};

const getTransactionIdFromPayload = (payload = {}) =>
  payload.tran_id || payload.tran_id_value || payload.transaction_id || payload.value_c || null;

const saveSslTransactionInit = async ({
  order,
  transactionId,
  formPayload,
  initResponse = null,
  gatewayUrl = null,
  gatewayStatus = "initiated",
}) => {
  try {
    const maskedPayload = { ...formPayload, store_passwd: "***" };

    await pool.query(
      `INSERT INTO \`transaction\` (
         order_id, order_number, user_id, gateway, payment_method, transaction_id,
         amount, currency, gateway_status, payment_status, gateway_url,
         init_payload, init_response
       ) VALUES (?, ?, ?, 'sslcommerz', 'sslcommerz', ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         order_id = VALUES(order_id),
         order_number = VALUES(order_number),
         user_id = VALUES(user_id),
         amount = VALUES(amount),
         currency = VALUES(currency),
         gateway_status = VALUES(gateway_status),
         payment_status = VALUES(payment_status),
         gateway_url = VALUES(gateway_url),
         init_payload = VALUES(init_payload),
         init_response = VALUES(init_response)`,
      [
        order.id,
        order.order_number || null,
        order.user_id || null,
        transactionId,
        Number(order.total || 0),
        formPayload.currency || "BDT",
        gatewayStatus,
        order.payment_status || "unpaid",
        gatewayUrl,
        safeJsonStringify(maskedPayload),
        safeJsonStringify(initResponse),
      ]
    );
  } catch (error) {
    console.error("Save SSLCommerz init transaction error:", error.message);
  }
};

const saveSslTransactionReturn = async ({
  orderId,
  transactionId,
  payload,
  gatewayStatus,
  paymentStatus,
  validation = null,
}) => {
  try {
    let order = null;
    if (orderId) {
      const [orders] = await pool.query(
        `SELECT id, order_number, user_id, total, payment_method, payment_status
         FROM orders
         WHERE id = ?
         LIMIT 1`,
        [orderId]
      );
      order = orders[0] || null;
    }

    const txId = transactionId || `SSL-${orderId || "unknown"}-${Date.now()}`;
    const parsedAmount = Number(payload.amount || payload.total_amount || order?.total || 0);
    const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
    const currency = payload.currency || payload.currency_type || "BDT";

    await pool.query(
      `INSERT INTO \`transaction\` (
         order_id, order_number, user_id, gateway, payment_method, transaction_id,
         bank_transaction_id, validation_id, amount, currency, gateway_status,
         payment_status, return_payload, validation_payload
       ) VALUES (?, ?, ?, 'sslcommerz', 'sslcommerz', ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         order_id = COALESCE(VALUES(order_id), order_id),
         order_number = COALESCE(VALUES(order_number), order_number),
         user_id = COALESCE(VALUES(user_id), user_id),
         bank_transaction_id = VALUES(bank_transaction_id),
         validation_id = VALUES(validation_id),
         amount = VALUES(amount),
         currency = VALUES(currency),
         gateway_status = VALUES(gateway_status),
         payment_status = VALUES(payment_status),
         return_payload = VALUES(return_payload),
         validation_payload = VALUES(validation_payload)`,
      [
        order?.id || null,
        order?.order_number || payload.value_b || null,
        order?.user_id || null,
        txId,
        payload.bank_tran_id || payload.bank_transaction_id || null,
        payload.val_id || null,
        amount,
        currency,
        gatewayStatus,
        paymentStatus,
        safeJsonStringify(payload),
        safeJsonStringify(validation),
      ]
    );
  } catch (error) {
    console.error("Save SSLCommerz return transaction error:", error.message);
  }
};

// ─────────────────────────────────────────────────────
router.get("/sslcommerz/status", (req, res) => {
  const { storeId, storePassword, isLive } = getSslCommerzConfig();

  res.json({
    success: true,
    configured: Boolean(storeId && storePassword),
    mode: isLive ? "live" : "sandbox",
  });
});

// GET /api/orders
// ─────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { user_id, vendor_id } = req.query;

  try {
    let query = `
      SELECT DISTINCT
        orders.id, orders.user_id, orders.subtotal, orders.shipping_fee,
        orders.courier_fee, orders.cod_fee, orders.discount, orders.total,
        orders.coupon_code, orders.payment_method, orders.payment_status,
        orders.order_status AS status, orders.notes, orders.estimated_delivery_date,
        orders.created_at, orders.updated_at, orders.customer_name,
        orders.customer_phone, orders.shipping_address, orders.shipping_division,
        orders.shipping_district, orders.shipping_thana, orders.order_number,
        orders.cancel_reason, orders.return_reason
      FROM orders`;
    const params = [];

    if (vendor_id) {
      query += ` INNER JOIN order_items ON order_items.order_id = orders.id WHERE order_items.seller_id = ?`;
      params.push(vendor_id);
    } else if (user_id) {
      query += ` WHERE orders.user_id = ?`;
      params.push(user_id);
    }

    query += ` ORDER BY orders.created_at DESC`;

    const [orders] = await pool.query(query, params);

    if (!orders || orders.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    const orderIds   = orders.map(o => o.id);
    const itemParams = [...orderIds];

    let itemsSql = `
      SELECT order_id, product_id, product_name, quantity, unit_price,
             total_price, product_image, seller_id
      FROM order_items
      WHERE order_id IN (${orderIds.map(() => "?").join(",")})`;

    if (vendor_id) {
      itemsSql += ` AND seller_id = ?`;
      itemParams.push(vendor_id);
    }

    const [items] = await pool.query(itemsSql, itemParams);

    const enriched = orders.map(o => ({
      ...o,
      items: (items || []).filter(i => i.order_id === o.id),
    }));

    res.json({ success: true, orders: enriched });
  } catch (error) {
    console.error("Fetch orders error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/orders/product/:productId/stats
// ─────────────────────────────────────────────────────
router.get("/product/:productId/stats", async (req, res) => {
  const { productId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT
         COUNT(DISTINCT oi.order_id)   AS order_count,
         COUNT(DISTINCT o.user_id)     AS customer_count,
         COALESCE(SUM(oi.quantity), 0) AS quantity_sold
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = ?
         AND COALESCE(o.order_status, '') <> 'cancelled'`,
      [productId]
    );

    const stats = rows?.[0] || {};
    res.json({
      success: true,
      data: {
        order_count:    Number(stats.order_count    || 0),
        customer_count: Number(stats.customer_count || 0),
        quantity_sold:  Number(stats.quantity_sold  || 0),
      },
    });
  } catch (error) {
    console.error("Fetch product order stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/orders
// ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    user_id, subtotal, shipping_fee, courier_fee, cod_fee, discount, total,
    coupon_code, payment_method, payment_status, customer_name, customer_phone,
    shipping_address, shipping_division, shipping_district, shipping_thana,
    notes, estimated_delivery_date, items, save_address, address_label,
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (!items || !Array.isArray(items) || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "No order items provided" });
    }

    let verifiedDiscount = 0;
    const normalizedCouponCode = normalizeCouponCode(coupon_code);

    if (normalizedCouponCode) {
      const [couponRows] = await conn.query(
        `SELECT *
         FROM coupons
         WHERE code = ?
           AND is_active = 1
           AND (starts_at IS NULL OR starts_at <= NOW())
           AND (expires_at IS NULL OR expires_at >= NOW())
           AND (usage_limit IS NULL OR used_count < usage_limit)
         LIMIT 1`,
        [normalizedCouponCode]
      );

      const coupon = couponRows[0];
      if (!coupon) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Invalid coupon" });
      }

      const eligibleSubtotal = await getCouponEligibleSubtotal(conn, coupon, items);
      const minOrderAmount = toNumberOrNull(coupon.min_order_amount);
      if (eligibleSubtotal <= 0 || (minOrderAmount !== null && eligibleSubtotal < minOrderAmount)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Coupon is not valid for this order" });
      }

      verifiedDiscount = calculateCouponDiscount(coupon, eligibleSubtotal);
    }

    const verifiedTotal =
      Number(subtotal || 0) +
      Number(shipping_fee || 0) +
      Number(courier_fee || 0) +
      Number(cod_fee || 0) -
      verifiedDiscount;

    const orderNumber = generateInvoiceNumber("MRT");

    // Derive initial payment_status:
    // - If caller passes it explicitly, use that
    // - Otherwise: COD and SSLCommerz start unpaid; other legacy online methods stay paid
    const normalizedPaymentMethod = String(payment_method || "cod").toLowerCase();
    if (!["cod", "sslcommerz", "wallet"].includes(normalizedPaymentMethod)) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Unsupported payment method" });
    }
    const initialPaymentStatus = normalizedPaymentMethod === "wallet" ? "paid" : "unpaid";

    const [orderResult] = await conn.query(
      `INSERT INTO orders (
         user_id, subtotal, shipping_fee, courier_fee, cod_fee, discount, total,
         coupon_code, payment_method, customer_name, customer_phone,
         shipping_address, shipping_division, shipping_district, shipping_thana,
         notes, estimated_delivery_date, order_status, payment_status, order_number
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        user_id, subtotal, shipping_fee, courier_fee, cod_fee, verifiedDiscount, verifiedTotal,
        normalizedCouponCode || null,
        normalizedPaymentMethod,
        customer_name,
        customer_phone,
        shipping_address   || null,
        shipping_division  || null,
        shipping_district  || null,
        shipping_thana     || null,
        notes              || null,
        estimated_delivery_date || null,
        initialPaymentStatus,
        orderNumber,
      ]
    );

    const orderId = orderResult.insertId;

    const itemsValues = items.map(it => [
      orderId,
      it.product_id    ?? null,
      it.vendor_id     ?? it.seller_id ?? null,
      it.product_name,
      it.product_image || null,
      it.quantity,
      it.unit_price,
      it.total_price,
    ]);

    await conn.query(
      `INSERT INTO order_items
         (order_id, product_id, seller_id, product_name, product_image, quantity, unit_price, total_price)
       VALUES ?`,
      [itemsValues]
    );

    if (save_address && customer_name && customer_phone && shipping_address) {
      await conn.query(
        `INSERT INTO shipping_addresses
           (user_id, label, customer_name, customer_phone, division, district, thana, address, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          user_id,
          address_label      || "Home",
          customer_name,
          customer_phone,
          shipping_division  || null,
          shipping_district  || null,
          shipping_thana     || null,
          shipping_address,
        ]
      );
    }

    if (normalizedCouponCode) {
      await conn.query(
        "UPDATE coupons SET used_count = used_count + 1 WHERE code = ?",
        [normalizedCouponCode]
      );
    }

    let walletTransactionId = null;
    if (normalizedPaymentMethod === "wallet") {
      const walletReference = `mart-order-${orderNumber}`;
      const walletPayment = await debitMainWallet({
        userId: user_id,
        amount: verifiedTotal,
        referenceId: walletReference,
        description: `Mart order ${orderNumber}`,
      });
      walletTransactionId = walletPayment.transaction_id;
    }

    await conn.commit();

    if (walletTransactionId) {
      await saveWalletTransaction({
        order: { id: orderId, order_number: orderNumber, user_id, total: verifiedTotal },
        transactionId: walletTransactionId,
      }).catch((transactionError) => {
        // The payment is already successful; never report a failed order just
        // because an audit-row retry is needed.
        console.error("Save wallet order transaction error:", transactionError.message);
      });
    }

    if (normalizedPaymentMethod === "cod" || initialPaymentStatus === "paid") {
      await awardMartReward({ userId: user_id, orderNumber, amount: verifiedTotal }).catch((rewardError) => {
        console.error(`Mart reward credit failed for order ${orderNumber}:`, rewardError.message);
      });
    }

    // ── Notify every seller who has at least one item in this order ──
    // order_items.seller_id stores sellers.id, but notifications are keyed
    // by the seller's login user_id, so we resolve sellers.id -> sellers.user_id.
    try {
      const distinctSellerIds = [...new Set(
        itemsValues.map((row) => row[2]).filter((id) => id != null)
      )];

      if (distinctSellerIds.length > 0) {
        const [sellerRows] = await pool.query(
          `SELECT id, user_id FROM sellers WHERE id IN (?)`,
          [distinctSellerIds]
        );

        const notifyRows = sellerRows
          .filter((s) => s.user_id != null)
          .map((s) => [
            s.user_id,
            "New order received",
            `Order ${orderNumber} — ৳${Number(verifiedTotal).toLocaleString()}`,
            "order",
            orderId,
            null,
            `/mart?tab=orders`,
          ]);

        if (notifyRows.length > 0) {
          await pool.query(
            `INSERT INTO notifications
               (user_id, title, message, type, reference_id, product_id, action_url, is_read, created_at)
             VALUES ${notifyRows.map(() => "(?, ?, ?, ?, ?, ?, ?, 0, NOW())").join(", ")}`,
            notifyRows.flat()
          );
        }
      }
    } catch (notifyError) {
      // Never let a notification failure break order creation
      console.error("Order notification error:", notifyError.message);
    }

    res.json({ success: true, order_id: orderId, order_number: orderNumber, wallet_transaction_id: walletTransactionId });
  } catch (error) {
    await conn.rollback();
    console.error("Create order error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// POST /api/orders/:id/sslcommerz/init
router.post("/:id/sslcommerz/init", async (req, res) => {
  const orderId = Number(req.params.id);
  const { storeId, storePassword, initUrl } = getSslCommerzConfig();

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid order id" });
  }

  if (!storeId || !storePassword) {
    return res.status(500).json({
      success: false,
      message: "SSLCommerz credentials are not configured",
    });
  }

  try {
    const [orders] = await pool.query(
      `SELECT id, user_id, order_number, total, customer_name, customer_phone, shipping_address,
              shipping_district, payment_method, payment_status
       FROM orders
       WHERE id = ?
       LIMIT 1`,
      [orderId]
    );

    const order = orders[0];
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.payment_method !== "sslcommerz") {
      return res.status(400).json({ success: false, message: "Order is not an SSLCommerz payment order" });
    }

    if (order.payment_status === "paid") {
      return res.status(400).json({ success: false, message: "Order is already paid" });
    }

    const [items] = await pool.query(
      `SELECT product_name, quantity FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    const transactionId = `MRT-${orderId}-${Date.now()}`;
    const successUrl = buildSslCommerzReturnUrl("success");
    const failUrl = buildSslCommerzReturnUrl("fail");
    const cancelUrl = buildSslCommerzReturnUrl("cancel");
    const ipnUrl = buildSslCommerzReturnUrl("ipn");
    const form = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: Number(order.total || 0).toFixed(2),
      currency: "BDT",
      tran_id: transactionId,
      success_url: successUrl,
      fail_url: failUrl,
      cancel_url: cancelUrl,
      ipn_url: ipnUrl,
      cus_name: order.customer_name || "Yess Mart Customer",
      cus_email: req.body?.customer_email || "customer@yessmart.local",
      cus_add1: order.shipping_address || "Bangladesh",
      cus_city: order.shipping_district || "Dhaka",
      cus_state: order.shipping_district || "Dhaka",
      cus_postcode: req.body?.postcode || "1000",
      cus_country: "Bangladesh",
      cus_phone: order.customer_phone || "01700000000",
      shipping_method: "Courier",
      ship_name: order.customer_name || "Yess Mart Customer",
      ship_add1: order.shipping_address || "Bangladesh",
      ship_city: order.shipping_district || "Dhaka",
      ship_state: order.shipping_district || "Dhaka",
      ship_postcode: req.body?.postcode || "1000",
      ship_country: "Bangladesh",
      product_name: items.map((item) => `${item.product_name} x${item.quantity}`).join(", ").slice(0, 255) || "Yess Mart Order",
      product_category: "Mart",
      product_profile: "general",
      value_a: String(orderId),
      value_b: order.order_number || "",
    });

    const formPayload = Object.fromEntries(form.entries());

    console.log("SSLCommerz init payload:", {
      ...formPayload,
      store_passwd: "***",
    });

    await saveSslTransactionInit({
      order,
      transactionId,
      formPayload,
      gatewayStatus: "initiated",
    });

    const response = await axios.post(initUrl, form.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });

    const gatewayUrl = response.data?.GatewayPageURL;
    if (!gatewayUrl) {
      await saveSslTransactionInit({
        order,
        transactionId,
        formPayload,
        initResponse: response.data,
        gatewayStatus: "init_failed",
      });

      return res.status(502).json({
        success: false,
        message: response.data?.failedreason || "SSLCommerz did not return a payment URL",
      });
    }

    await saveSslTransactionInit({
      order,
      transactionId,
      formPayload,
      initResponse: response.data,
      gatewayUrl,
      gatewayStatus: "gateway_opened",
    });

    res.json({
      success: true,
      gateway_url: gatewayUrl,
      transaction_id: transactionId,
      return_urls: {
        success_url: successUrl,
        fail_url: failUrl,
        cancel_url: cancelUrl,
        ipn_url: ipnUrl,
      },
    });
  } catch (error) {
    console.error("SSLCommerz init error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Could not open SSLCommerz payment" });
  }
});

// SSLCommerz redirects/callbacks
router.all("/sslcommerz/:status", async (req, res) => {
  const status = req.params.status;
  const payload = { ...(req.query || {}), ...(req.body || {}) };
  const orderId = extractSslOrderId(payload);
  const transactionId = getTransactionIdFromPayload(payload);
  const redirectStatus = status === "success" || status === "ipn" ? "success" : status;

  console.log("SSLCommerz return payload:", {
    status,
    order_id: orderId,
    payload,
  });

  if (!orderId) {
    await saveSslTransactionReturn({
      orderId: null,
      transactionId,
      payload,
      gatewayStatus: redirectStatus,
      paymentStatus: redirectStatus === "success" ? "unpaid" : "unpaid",
    });

    return res.redirect(buildCheckoutRedirectUrl(redirectStatus, null, payload));
  }

  try {
    if (status === "success" || status === "ipn") {
      let verified = true;
      let validation = null;
      const { isLive, storeId } = getSslCommerzConfig();
      const shouldValidate = isLive || storeId !== "testbox";

      if (shouldValidate) {
        try {
          validation = await validateSslCommerzPayment(payload.val_id);
          verified = ["VALID", "VALIDATED"].includes(String(validation?.status || "").toUpperCase());
        } catch (error) {
          console.error("SSLCommerz validation error:", error.response?.data || error.message);
          verified = false;
        }
      }

      await pool.query(
        `UPDATE orders
         SET payment_status = ?
         WHERE id = ? AND payment_method = 'sslcommerz'`,
        [verified ? "paid" : "unpaid", orderId]
      );

      if (verified) {
        const [orderRows] = await pool.query(
          `SELECT user_id, order_number, total FROM orders WHERE id = ? LIMIT 1`,
          [orderId]
        );
        const order = orderRows[0];
        if (order) {
          await awardMartReward({
            userId: order.user_id,
            orderNumber: order.order_number,
            amount: Number(order.total || 0),
          }).catch((rewardError) => {
            console.error(`Mart reward credit failed for order ${order.order_number}:`, rewardError.message);
          });
        }
      }

      await saveSslTransactionReturn({
        orderId,
        transactionId,
        payload,
        gatewayStatus: verified ? "success" : "validation_failed",
        paymentStatus: verified ? "paid" : "unpaid",
        validation,
      });

      if (status === "ipn") {
        return res.json({ success: verified, order_id: orderId, validation_status: validation?.status || null });
      }

      return res.redirect(buildCheckoutRedirectUrl(verified ? "success" : "failed", orderId, payload));
    }

    await pool.query(
      `UPDATE orders
       SET payment_status = 'unpaid'
       WHERE id = ? AND payment_method = 'sslcommerz'`,
      [orderId]
    );

    await saveSslTransactionReturn({
      orderId,
      transactionId,
      payload,
      gatewayStatus: redirectStatus,
      paymentStatus: "unpaid",
    });

    return res.redirect(buildCheckoutRedirectUrl(redirectStatus, orderId, payload));
  } catch (error) {
    console.error("SSLCommerz callback error:", error.message);
    await saveSslTransactionReturn({
      orderId,
      transactionId,
      payload,
      gatewayStatus: "callback_error",
      paymentStatus: "unpaid",
    });

    if (status === "ipn") {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.redirect(buildCheckoutRedirectUrl("failed", orderId, payload));
  }
});

// ─────────────────────────────────────────────────────
// PUT /api/orders/:id
// ─────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const { status, cancel_reason, return_reason } = req.body;
  const allowed = [
    "pending", "processing", "confirmed", "shipped",
    "delivered", "cancelled", "return_requested",
  ];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `status must be one of: ${allowed.join(", ")}`,
    });
  }

  // Map order_status → delivery_requests.status
  const drStatusMap = {
    pending:          "pending",
    processing:       "pending",
    confirmed:        "pending",
    shipped:          "accepted",
    delivered:        "delivered",
    cancelled:        "cancelled",
    return_requested: "cancelled",
  };

  try {
    // Step 1: Fetch current order to check payment_method & payment_status
    const [orderRows] = await pool.query(
      `SELECT user_id, order_number, total, payment_method, payment_status FROM orders WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    if (!orderRows.length) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const { payment_method, payment_status } = orderRows[0];

    // Step 2: Build dynamic SET fields
    const setFields = ["order_status = ?"];
    const setValues = [status];

    // Auto payment logic:
    // COD     → mark paid only when delivered
    // Non-COD → mark paid when confirmed or beyond (already paid at placement,
    //           but guard here in case it somehow wasn't set)
    if (payment_method === "cod") {
      if (status === "delivered") {
        setFields.push("payment_status = 'paid'");
        console.log(`💰 COD order #${req.params.id} delivered → payment_status = paid`);
      }
    } else {
      // Online payment — ensure paid once order progresses past pending
      if (
        ["confirmed", "processing", "shipped", "delivered"].includes(status) &&
        payment_status !== "paid"
      ) {
        setFields.push("payment_status = 'paid'");
        console.log(`💰 Online order #${req.params.id} → payment_status = paid`);
      }
    }

    // Persist cancel reason
    if (cancel_reason) {
      setFields.push("cancel_reason = ?");
      setValues.push(cancel_reason);
    }

    // Persist return reason
    if (return_reason) {
      setFields.push("return_reason = ?");
      setValues.push(return_reason);
    }

    setValues.push(req.params.id); // WHERE clause

    // Step 3: Update orders table
    const [orderResult] = await pool.query(
      `UPDATE orders SET ${setFields.join(", ")} WHERE id = ?`,
      setValues
    );

    if (!orderResult.affectedRows) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    console.log(`✅ orders #${req.params.id} → ${status}`);

    // Step 4: Sync delivery_requests (never overwrite 'declined')
    const drStatus = drStatusMap[status];

    const [drRows] = await pool.query(
      `SELECT id, status FROM delivery_requests WHERE order_id = ?`,
      [req.params.id]
    );

    console.log(`🔍 Found ${drRows.length} delivery_request(s) for order #${req.params.id}:`, drRows);

    if (drRows.length === 0) {
      console.warn(`⚠️  No delivery_request found for order_id = ${req.params.id}`);
    } else {
      const [drResult] = await pool.query(
        `UPDATE delivery_requests
         SET status = ?
         WHERE order_id = ?
           AND status != 'declined'`,
        [drStatus, req.params.id]
      );

      if (drResult.affectedRows > 0) {
        console.log(`✅ delivery_requests for order #${req.params.id} → '${drStatus}' (${drResult.affectedRows} row(s))`);
      } else {
        console.warn(`⚠️  delivery_requests not updated — all rows may be 'declined'`);
      }
    }

    const shouldRetryReward =
      (status === "delivered" && payment_method === "cod") ||
      (payment_method !== "cod" &&
        ["confirmed", "processing", "shipped", "delivered"].includes(status));

    if (shouldRetryReward) {
      await awardMartReward({
        userId: orderRows[0].user_id,
        orderNumber: orderRows[0].order_number,
        amount: Number(orderRows[0].total || 0),
      }).catch((rewardError) => {
        console.error(`Mart reward credit failed for order ${orderRows[0].order_number}:`, rewardError.message);
      });
    }

    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) {
    console.error("❌ Update order error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
