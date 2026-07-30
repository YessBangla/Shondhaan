// routes/payments.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
// const db = require("../database/connection"); // adjust to your actual db connection module
const { initiateShurjoPayCheckout, verifyShurjoPayPayment } = require("../utils/shurjopay");
const requireAuth = require("../middleware/requireAuth"); // adjust to your actual auth middleware

router.post("/shurjopay/initiate", requireAuth, async (req, res) => {
  try {
    const { package_id, amount } = req.body;
    const employerUserId = req.user.id; // adjust to however your auth middleware attaches user info

    if (!package_id || !amount) {
      return res.status(400).json({ message: "package_id and amount are required" });
    }

    const orderId = `${process.env.SURJOPAY_MERCHANT_PREFIX}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    await db.query(
      `INSERT INTO payment_transactions (employer_user_id, package_id, amount, order_id, status) VALUES (?, ?, ?, ?, 'initiated')`,
      [employerUserId, package_id, amount, orderId]
    );

    const spResponse = await initiateShurjoPayCheckout({
      amount,
      orderId,
      customerName: req.user.name,
      customerEmail: req.user.email,
      customerPhone: req.user.phone,
    });

    // ShurjoPay's real field name may be checkout_url, redirect_url, or similar — check their docs/response
    const checkoutUrl = spResponse.checkout_url || spResponse.redirectGatewayURL;

    if (!checkoutUrl) {
      console.error("Unexpected ShurjoPay response shape:", spResponse);
      return res.status(502).json({ message: "পেমেন্ট গেটওয়ে থেকে সঠিক প্রতিক্রিয়া পাওয়া যায়নি" });
    }

    await db.query(
      `UPDATE payment_transactions SET raw_response = ?, status = 'pending' WHERE order_id = ?`,
      [JSON.stringify(spResponse), orderId]
    );

    res.json({ checkout_url: checkoutUrl, order_id: orderId });
  } catch (err) {
    console.error("ShurjoPay initiate error:", err);
    res.status(500).json({ message: "পেমেন্ট শুরু করতে সমস্যা হয়েছে" });
  }
});

// Callback ShurjoPay redirects to after payment — verifies and updates status
router.get("/shurjopay/verify/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await verifyShurjoPayPayment(orderId);
    // Update payment_transactions.status based on result.sp_code / result.status here
    res.json(result);
  } catch (err) {
    console.error("ShurjoPay verify error:", err);
    res.status(500).json({ message: "যাচাই করতে সমস্যা হয়েছে" });
  }
});

module.exports = router;