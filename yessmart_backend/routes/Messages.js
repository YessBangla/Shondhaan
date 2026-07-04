// routes/messages.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  createUserMessage,
  createSellerReply,
  emitMartMessageEvents,
} = require("../socket/martMessages");

// ─────────────────────────────────────────────
// Ensure chat tables exist
// ─────────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mart_conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      user_id INT NOT NULL,
      seller_user_id INT NOT NULL,
      seller_id INT NOT NULL,
      user_name VARCHAR(255) NULL,
      seller_name VARCHAR(255) NULL,
      product_name VARCHAR(255) NULL,
      product_image VARCHAR(500) NULL,
      last_message TEXT NULL,
      last_message_at TIMESTAMP NULL,
      user_unread INT NOT NULL DEFAULT 0,
      seller_unread INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_conv (product_id, user_id, seller_id),
      INDEX idx_conv_user (user_id),
      INDEX idx_conv_seller_user (seller_user_id),
      INDEX idx_conv_seller (seller_id),
      INDEX idx_conv_product (product_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mart_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT NOT NULL,
      sender_id INT NOT NULL,
      sender_role ENUM('user','seller') NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_msg_conversation (conversation_id),
      INDEX idx_msg_sender (sender_id),
      CONSTRAINT fk_msg_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES mart_conversations(id)
        ON DELETE CASCADE
    )
  `);
}

ensureTables().catch((err) => {
  console.error("Messages table init error:", err.message);
});

// ─────────────────────────────────────────────
// POST /api/messages
// body: product_id, user_id, seller_user_id, message, user_name?, product_name?, product_image?
// ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const result = await createUserMessage(req.body);
    emitMartMessageEvents(req.app.get("io"), result.conversation, result.message);

    return res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    console.error("Send message error:", err);

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      sqlMessage: err.sqlMessage || null,
    });
  }
});

// ─────────────────────────────────────────────
// POST /api/messages/reply
// body: conversation_id, seller_user_id, message
// ─────────────────────────────────────────────
router.post("/reply", async (req, res) => {
  try {
    const result = await createSellerReply(req.body);
    emitMartMessageEvents(req.app.get("io"), result.conversation, result.message);

    return res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    console.error("Reply message error:", err);

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      sqlMessage: err.sqlMessage || null,
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/messages/find?product_id=&user_id=&seller_user_id=
// ─────────────────────────────────────────────
router.get("/find", async (req, res) => {
  try {
    const { product_id, user_id, seller_user_id } = req.query;

    if (!product_id || !user_id || !seller_user_id) {
      return res.status(400).json({
        success: false,
        message: "product_id, user_id and seller_user_id are required",
      });
    }

    const [rows] = await pool.query(
      `SELECT id, user_unread, seller_unread, last_message, last_message_at
       FROM mart_conversations
       WHERE product_id = ?
       AND user_id = ?
       AND seller_user_id = ?
       LIMIT 1`,
      [product_id, user_id, seller_user_id]
    );

    return res.json({
      success: true,
      data: rows[0] || null,
    });
  } catch (err) {
    console.error("Find conversation error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
      sqlMessage: err.sqlMessage || null,
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/messages/inbox/user/:userId
// ─────────────────────────────────────────────
router.get("/inbox/user/:userId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT mc.id,
              mc.product_id,
              mc.seller_id,
              mc.seller_user_id,
              mc.seller_name,
              COALESCE(NULLIF(mc.product_name, ''), NULLIF(p.name_bn, ''), NULLIF(p.name_en, ''), CONCAT('Product ', mc.product_id)) AS product_name,
              COALESCE(NULLIF(mc.product_image, ''), p.image) AS product_image,
              p.sale_price AS product_price,
              p.original_price AS product_original_price,
              p.stock AS product_stock,
              mc.last_message,
              mc.last_message_at,
              mc.user_unread AS unread_count
       FROM mart_conversations mc
       LEFT JOIN products p ON p.id = mc.product_id
       WHERE mc.user_id = ?
       ORDER BY mc.last_message_at DESC`,
      [req.params.userId]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("User inbox error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
      sqlMessage: err.sqlMessage || null,
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/messages/inbox/seller/:sellerUserId
// ─────────────────────────────────────────────
router.get("/inbox/seller/:sellerUserId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT mc.id,
              mc.product_id,
              mc.user_id,
              mc.user_name,
              COALESCE(NULLIF(mc.product_name, ''), NULLIF(p.name_bn, ''), NULLIF(p.name_en, ''), CONCAT('Product ', mc.product_id)) AS product_name,
              COALESCE(NULLIF(mc.product_image, ''), p.image) AS product_image,
              p.sale_price AS product_price,
              p.original_price AS product_original_price,
              p.stock AS product_stock,
              mc.last_message,
              mc.last_message_at,
              mc.seller_unread AS unread_count
       FROM mart_conversations mc
       LEFT JOIN products p ON p.id = mc.product_id
       WHERE mc.seller_user_id = ?
       ORDER BY mc.last_message_at DESC`,
      [req.params.sellerUserId]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Seller inbox error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
      sqlMessage: err.sqlMessage || null,
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/messages/unread/:userId
// ─────────────────────────────────────────────
router.get("/unread/:userId", async (req, res) => {
  try {
    const uid = Number(req.params.userId);

    const [[asUser]] = await pool.query(
      `SELECT COALESCE(SUM(user_unread), 0) AS count
       FROM mart_conversations
       WHERE user_id = ?`,
      [uid]
    );

    const [[asSeller]] = await pool.query(
      `SELECT COALESCE(SUM(seller_unread), 0) AS count
       FROM mart_conversations
       WHERE seller_user_id = ?`,
      [uid]
    );

    return res.json({
      success: true,
      data: {
        as_user: Number(asUser.count),
        as_seller: Number(asSeller.count),
        total: Number(asUser.count) + Number(asSeller.count),
      },
    });
  } catch (err) {
    console.error("Unread count error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
      sqlMessage: err.sqlMessage || null,
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/messages/:conversationId
// query: viewer_id=&viewer_role=user|seller
// ─────────────────────────────────────────────
router.get("/:conversationId", async (req, res) => {
  try {
    const { viewer_id, viewer_role } = req.query;
    const convId = req.params.conversationId;

    const [convRows] = await pool.query(
      `SELECT
         mc.*,
         COALESCE(NULLIF(mc.product_name, ''), NULLIF(p.name_bn, ''), NULLIF(p.name_en, ''), CONCAT('Product ', mc.product_id)) AS resolved_product_name,
         COALESCE(NULLIF(mc.product_image, ''), p.image) AS resolved_product_image,
         p.sale_price AS product_price,
         p.original_price AS product_original_price,
         p.stock AS product_stock,
         p.status AS product_status,
         p.unit AS product_unit
       FROM mart_conversations mc
       LEFT JOIN products p ON p.id = mc.product_id
       WHERE mc.id = ?
       LIMIT 1`,
      [convId]
    );

    if (!convRows.length) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const conv = {
      ...convRows[0],
      product_name: convRows[0].resolved_product_name || convRows[0].product_name,
      product_image: convRows[0].resolved_product_image || convRows[0].product_image,
    };

    if (viewer_id) {
      const isParticipant =
        Number(conv.user_id) === Number(viewer_id) ||
        Number(conv.seller_user_id) === Number(viewer_id);

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: "Not a participant",
        });
      }
    }

    const [messages] = await pool.query(
      `SELECT *
       FROM mart_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`,
      [convId]
    );

    if (viewer_id && viewer_role) {
      const oppositeRole = viewer_role === "user" ? "seller" : "user";

      await pool.query(
        `UPDATE mart_messages
         SET is_read = 1
         WHERE conversation_id = ?
         AND sender_role = ?
         AND is_read = 0`,
        [convId, oppositeRole]
      );

      if (viewer_role === "user") {
        await pool.query(
          `UPDATE mart_conversations
           SET user_unread = 0
           WHERE id = ?`,
          [convId]
        );
      }

      if (viewer_role === "seller") {
        await pool.query(
          `UPDATE mart_conversations
           SET seller_unread = 0
           WHERE id = ?`,
          [convId]
        );
      }
    }

    return res.json({
      success: true,
      data: {
        conversation: conv,
        messages,
      },
    });
  } catch (err) {
    console.error("Get messages error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
      sqlMessage: err.sqlMessage || null,
    });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/messages/:conversationId
// body: user_id
// ─────────────────────────────────────────────
router.delete("/:conversationId", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const [rows] = await pool.query(
      `SELECT user_id, seller_user_id
       FROM mart_conversations
       WHERE id = ?
       LIMIT 1`,
      [req.params.conversationId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const conv = rows[0];

    const isParticipant =
      Number(conv.user_id) === Number(user_id) ||
      Number(conv.seller_user_id) === Number(user_id);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await pool.query(
      `DELETE FROM mart_conversations
       WHERE id = ?`,
      [req.params.conversationId]
    );

    return res.json({
      success: true,
      message: "Conversation deleted",
    });
  } catch (err) {
    console.error("Delete conversation error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
      sqlMessage: err.sqlMessage || null,
    });
  }
});

module.exports = router;
