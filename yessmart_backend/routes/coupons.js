const express = require("express");
const pool = require("../db");

const router = express.Router();

const normalizeCode = (code) => String(code || "").trim().toUpperCase();

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const calculateDiscount = (coupon, subtotal) => {
  const orderSubtotal = Number(subtotal || 0);
  const discountValue = Number(coupon.discount_value || 0);
  let discount = 0;

  if (coupon.discount_type === "percentage") {
    discount = Math.round((orderSubtotal * discountValue) / 100);
    const maxDiscount = toNumberOrNull(coupon.max_discount_amount);
    if (maxDiscount !== null) discount = Math.min(discount, maxDiscount);
  } else {
    discount = discountValue;
  }

  return Math.max(0, Math.min(Math.round(discount), Math.round(orderSubtotal)));
};

const normalizeCartItems = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      product_id: Number(item?.product_id),
      quantity: Math.max(0, Number(item?.quantity || 0)),
      unit_price: Math.max(0, Number(item?.unit_price || 0)),
    }))
    .filter((item) => Number.isInteger(item.product_id) && item.product_id > 0 && item.quantity > 0);
};

const getEligibleSubtotal = async (coupon, items, fallbackSubtotal) => {
  const normalizedItems = normalizeCartItems(items);
  if (normalizedItems.length === 0) {
    return Math.max(0, Number(fallbackSubtotal || 0));
  }

  const productIds = [...new Set(normalizedItems.map((item) => item.product_id))];
  const [products] = await pool.query(
    `SELECT id, seller_id
     FROM products
     WHERE id IN (?)`,
    [productIds]
  );

  const productMap = new Map(products.map((product) => [Number(product.id), product]));
  const couponSellerId = toNumberOrNull(coupon.seller_id);

  return normalizedItems.reduce((sum, item) => {
    const product = productMap.get(item.product_id);
    if (!product) return sum;
    if (couponSellerId !== null && Number(product.seller_id) !== couponSellerId) return sum;

    const price = Number(item.unit_price || 0);
    return sum + price * item.quantity;
  }, 0);
};

const findValidCoupon = async (code) => {
  const [rows] = await pool.query(
    `SELECT *
     FROM coupons
     WHERE code = ?
       AND is_active = 1
       AND (starts_at IS NULL OR starts_at <= NOW())
       AND (expires_at IS NULL OR expires_at >= NOW())
       AND (usage_limit IS NULL OR used_count < usage_limit)
     LIMIT 1`,
    [normalizeCode(code)]
  );

  return rows[0] || null;
};

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const { seller_id } = req.query;
    const values = [];
    let where = "";

    if (seller_id) {
      where = "WHERE c.seller_id = ?";
      values.push(seller_id);
    } else {
      where = `WHERE c.is_active = 1
         AND (c.starts_at IS NULL OR c.starts_at <= NOW())
         AND (c.expires_at IS NULL OR c.expires_at >= NOW())
         AND (c.usage_limit IS NULL OR c.used_count < c.usage_limit)`;
    }

    values.push(limit);

    const [rows] = await pool.query(
      `SELECT c.id, c.seller_id, c.code, c.description, c.discount_type, c.discount_value,
              c.min_order_amount, c.max_discount_amount, c.usage_limit, c.used_count,
              c.starts_at, c.expires_at, c.is_active, c.created_at, c.updated_at,
              s.shop_name, s.seller_name
       FROM coupons c
       LEFT JOIN sellers s ON c.seller_id = s.id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT ?`,
      values
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/validate", async (req, res) => {
  try {
    const code = normalizeCode(req.body.code);
    const subtotal = Number(req.body.subtotal || 0);
    const items = req.body.items;

    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const coupon = await findValidCoupon(code);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid coupon" });
    }

    const eligibleSubtotal = await getEligibleSubtotal(coupon, items, subtotal);
    if (eligibleSubtotal <= 0) {
      return res.status(400).json({
        success: false,
        message: coupon.seller_id
          ? "This coupon is not valid for products in your cart"
          : "No eligible cart amount for this coupon",
      });
    }

    const minOrderAmount = toNumberOrNull(coupon.min_order_amount);
    if (minOrderAmount !== null && eligibleSubtotal < minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Min order ${minOrderAmount}`,
      });
    }

    res.json({
      success: true,
      data: {
        ...coupon,
        eligible_subtotal: eligibleSubtotal,
        discount_amount: calculateDiscount(coupon, eligibleSubtotal),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      code, description, discount_type, discount_value, min_order_amount,
      max_discount_amount, usage_limit, starts_at, expires_at, is_active, seller_id,
    } = req.body;
    const normalizedCode = normalizeCode(code);

    if (!normalizedCode) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    if (!["percentage", "fixed"].includes(discount_type)) {
      return res.status(400).json({ success: false, message: "discount_type must be percentage or fixed" });
    }

    const [result] = await pool.query(
      `INSERT INTO coupons (
         seller_id, code, description, discount_type, discount_value, min_order_amount,
         max_discount_amount, usage_limit, starts_at, expires_at, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seller_id || null,
        normalizedCode,
        description || null,
        discount_type,
        Number(discount_value || 0),
        toNumberOrNull(min_order_amount),
        toNumberOrNull(max_discount_amount),
        usage_limit === null || usage_limit === undefined || usage_limit === "" ? null : Number(usage_limit),
        starts_at || null,
        expires_at || null,
        is_active === false || is_active === 0 ? 0 : 1,
      ]
    );

    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const {
      code, description, discount_type, discount_value, min_order_amount,
      max_discount_amount, usage_limit, starts_at, expires_at, is_active, seller_id,
    } = req.body;

    if (discount_type && !["percentage", "fixed"].includes(discount_type)) {
      return res.status(400).json({ success: false, message: "discount_type must be percentage or fixed" });
    }

    const [result] = await pool.query(
      `UPDATE coupons SET
         seller_id = COALESCE(?, seller_id),
         code = COALESCE(?, code),
         description = ?,
         discount_type = COALESCE(?, discount_type),
         discount_value = COALESCE(?, discount_value),
         min_order_amount = ?,
         max_discount_amount = ?,
         usage_limit = ?,
         starts_at = ?,
         expires_at = ?,
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        seller_id || null,
        code ? normalizeCode(code) : null,
        description || null,
        discount_type || null,
        discount_value === undefined || discount_value === "" ? null : Number(discount_value),
        toNumberOrNull(min_order_amount),
        toNumberOrNull(max_discount_amount),
        usage_limit === null || usage_limit === undefined || usage_limit === "" ? null : Number(usage_limit),
        starts_at || null,
        expires_at || null,
        is_active === undefined ? null : is_active === false || is_active === 0 ? 0 : 1,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.json({ success: true, message: "Coupon updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM coupons WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    res.json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
