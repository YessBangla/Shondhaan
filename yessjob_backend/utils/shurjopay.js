// utils/shurjopay.js
let cachedToken = null;
let tokenExpiresAt = 0;

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

  const payload = {
    prefix: process.env.SURJOPAY_MERCHANT_PREFIX,
    token: auth.token,
    store_id: auth.store_id,
    return_url: process.env.PAYMENT_SUCCESS_REDIRECT_URL,
    cancel_url: process.env.PAYMENT_CANCEL_REDIRECT_URL,
    amount: amount,
    order_id: orderId,
    currency: "BDT",
    customer_name: customerName || "Employer",
    customer_address: customerAddress || "N/A",
    customer_email: customerEmail || "noemail@yessjob.com",
    customer_phone: customerPhone || "01700000000",
    customer_city: "Dhaka",
    client_ip: "127.0.0.1",
  };

  const res = await fetch(process.env.SURJOPAY_SECRETPAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`ShurjoPay secret-pay request failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data; // expect data.checkout_url (field name depends on ShurjoPay's actual response shape)
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

  if (!res.ok) {
    throw new Error(`ShurjoPay verification failed (HTTP ${res.status})`);
  }

  return res.json();
}

module.exports = { getShurjoPayToken, initiateShurjoPayCheckout, verifyShurjoPayPayment };