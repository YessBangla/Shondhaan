const pool = require("../db");

const userRoom = (userId) => `mart:user:${userId}`;
const sellerRoom = (sellerUserId) => `mart:seller:${sellerUserId}`;
const conversationRoom = (conversationId) => `mart:conversation:${conversationId}`;

async function getConversation(conversationId) {
  const [rows] = await pool.query(
    `SELECT
       mc.*,
       COALESCE(NULLIF(mc.product_name, ''), NULLIF(p.name_bn, ''), NULLIF(p.name_en, ''), CONCAT('Product ', mc.product_id)) AS resolved_product_name,
       COALESCE(NULLIF(mc.product_image, ''), p.image) AS resolved_product_image,
      JSON_UNQUOTE(JSON_EXTRACT(p.unit_prices, '$[0].sale_price')) AS product_price,
      JSON_UNQUOTE(JSON_EXTRACT(p.unit_prices, '$[0].original_price')) AS product_original_price,
      JSON_UNQUOTE(JSON_EXTRACT(p.unit_prices, '$[0].stock')) AS product_stock,
       p.status AS product_status,
       p.unit AS product_unit
     FROM mart_conversations mc
     LEFT JOIN products p ON p.id = mc.product_id
     WHERE mc.id = ?
     LIMIT 1`,
    [conversationId]
  );

  if (!rows[0]) return null;

  return {
    ...rows[0],
    product_name: rows[0].resolved_product_name || rows[0].product_name,
    product_image: rows[0].resolved_product_image || rows[0].product_image,
  };
}

async function getMessage(messageId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM mart_messages
     WHERE id = ?
     LIMIT 1`,
    [messageId]
  );

  return rows[0] || null;
}

function toSellerInboxRow(conversation) {
  return {
    id: conversation.id,
    product_id: conversation.product_id,
    user_id: conversation.user_id,
    user_name: conversation.user_name,
    product_name: conversation.product_name,
    product_image: conversation.product_image,
    product_price: conversation.product_price,
    product_original_price: conversation.product_original_price,
    product_stock: conversation.product_stock,
    last_message: conversation.last_message,
    last_message_at: conversation.last_message_at,
    unread_count: conversation.seller_unread,
  };
}

function toUserInboxRow(conversation) {
  return {
    id: conversation.id,
    product_id: conversation.product_id,
    seller_id: conversation.seller_id,
    seller_user_id: conversation.seller_user_id,
    seller_name: conversation.seller_name,
    product_name: conversation.product_name,
    product_image: conversation.product_image,
    product_price: conversation.product_price,
    product_original_price: conversation.product_original_price,
    product_stock: conversation.product_stock,
    last_message: conversation.last_message,
    last_message_at: conversation.last_message_at,
    unread_count: conversation.user_unread,
  };
}

function emitMartMessageEvents(io, conversation, message) {
  if (!io || !conversation || !message) return;

  const payload = {
    conversation,
    message,
    sellerInbox: toSellerInboxRow(conversation),
    userInbox: toUserInboxRow(conversation),
  };

  io.to(conversationRoom(conversation.id)).emit("mart:message:new", payload);
  io.to(sellerRoom(conversation.seller_user_id)).emit("mart:conversation:updated", payload);
  io.to(userRoom(conversation.user_id)).emit("mart:conversation:updated", payload);
}

async function createUserMessage(input) {
  const {
    product_id,
    user_id,
    seller_user_id,
    message,
    user_name,
    product_name,
    product_image,
  } = input || {};

  if (!product_id || !user_id || !seller_user_id || !String(message || "").trim()) {
    const err = new Error("product_id, user_id, seller_user_id and message are required");
    err.statusCode = 400;
    throw err;
  }

  const text = String(message).trim();

  const [sellerRows] = await pool.query(
    `SELECT id, shop_name, seller_name
     FROM sellers
     WHERE user_id = ?
     LIMIT 1`,
    [seller_user_id]
  );

  if (!sellerRows.length) {
    const err = new Error("Seller not found");
    err.statusCode = 404;
    throw err;
  }

  const seller = sellerRows[0];
  const [productRows] = await pool.query(
    `SELECT name_bn, name_en, image
     FROM products
     WHERE id = ?
     LIMIT 1`,
    [product_id]
  );
  const product = productRows[0] || {};
  const resolvedUserName = String(user_name || "").trim() || `User ${user_id}`;
  const resolvedProductName =
    String(product_name || "").trim() ||
    String(product.name_bn || product.name_en || "").trim() ||
    `Product ${product_id}`;
  const resolvedProductImage =
    String(product_image || "").trim() ||
    String(product.image || "").trim() ||
    null;

  await pool.query(
    `INSERT INTO mart_conversations
     (
      product_id,
      user_id,
      seller_user_id,
      seller_id,
      user_name,
      seller_name,
      product_name,
      product_image,
      last_message,
      last_message_at,
      seller_unread
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
     ON DUPLICATE KEY UPDATE
      user_name = VALUES(user_name),
      seller_name = VALUES(seller_name),
      product_name = VALUES(product_name),
      product_image = VALUES(product_image),
      last_message = VALUES(last_message),
      last_message_at = NOW(),
      seller_unread = seller_unread + 1`,
    [
      product_id,
      user_id,
      seller_user_id,
      seller.id,
      resolvedUserName,
      seller.shop_name || seller.seller_name || "Seller",
      resolvedProductName,
      resolvedProductImage,
      text,
    ]
  );

  const [convRows] = await pool.query(
    `SELECT id
     FROM mart_conversations
     WHERE product_id = ?
     AND user_id = ?
     AND seller_id = ?
     LIMIT 1`,
    [product_id, user_id, seller.id]
  );

  if (!convRows.length) {
    const err = new Error("Conversation was not created");
    err.statusCode = 500;
    throw err;
  }

  const conversationId = convRows[0].id;
  const [result] = await pool.query(
    `INSERT INTO mart_messages
     (conversation_id, sender_id, sender_role, message)
     VALUES (?, ?, 'user', ?)`,
    [conversationId, user_id, text]
  );

  const [conversation, savedMessage] = await Promise.all([
    getConversation(conversationId),
    getMessage(result.insertId),
  ]);

  return {
    conversation,
    message: savedMessage,
    data: {
      message_id: result.insertId,
      conversation_id: conversationId,
    },
  };
}

async function createSellerReply(input) {
  const { conversation_id, seller_user_id, message } = input || {};

  if (!conversation_id || !seller_user_id || !String(message || "").trim()) {
    const err = new Error("conversation_id, seller_user_id and message are required");
    err.statusCode = 400;
    throw err;
  }

  const text = String(message).trim();
  const conversation = await getConversation(conversation_id);

  if (!conversation) {
    const err = new Error("Conversation not found");
    err.statusCode = 404;
    throw err;
  }

  if (Number(conversation.seller_user_id) !== Number(seller_user_id)) {
    const err = new Error("Not your conversation");
    err.statusCode = 403;
    throw err;
  }

  const [result] = await pool.query(
    `INSERT INTO mart_messages
     (conversation_id, sender_id, sender_role, message)
     VALUES (?, ?, 'seller', ?)`,
    [conversation_id, seller_user_id, text]
  );

  await pool.query(
    `UPDATE mart_conversations
     SET last_message = ?,
         last_message_at = NOW(),
         user_unread = user_unread + 1
     WHERE id = ?`,
    [text, conversation_id]
  );

  const [updatedConversation, savedMessage] = await Promise.all([
    getConversation(conversation_id),
    getMessage(result.insertId),
  ]);

  return {
    conversation: updatedConversation,
    message: savedMessage,
    data: {
      message_id: result.insertId,
      conversation_id: Number(conversation_id),
    },
  };
}

function registerMartMessageSocket(io) {
  io.on("connection", (socket) => {
    socket.on("mart:join", ({ user_id, seller_user_id } = {}) => {
      if (user_id) socket.join(userRoom(user_id));
      if (seller_user_id) socket.join(sellerRoom(seller_user_id));
    });

    socket.on("mart:conversation:join", ({ conversation_id } = {}) => {
      if (conversation_id) socket.join(conversationRoom(conversation_id));
    });

    socket.on("mart:conversation:leave", ({ conversation_id } = {}) => {
      if (conversation_id) socket.leave(conversationRoom(conversation_id));
    });

    socket.on("mart:message:send", async (payload, ack) => {
      try {
        const result = await createUserMessage(payload);
        emitMartMessageEvents(io, result.conversation, result.message);
        ack?.({ success: true, data: result.data, message: result.message, conversation: result.conversation });
      } catch (err) {
        ack?.({ success: false, message: err.message || "Failed to send message" });
      }
    });

    socket.on("mart:message:reply", async (payload, ack) => {
      try {
        const result = await createSellerReply(payload);
        emitMartMessageEvents(io, result.conversation, result.message);
        ack?.({ success: true, data: result.data, message: result.message, conversation: result.conversation });
      } catch (err) {
        ack?.({ success: false, message: err.message || "Failed to send reply" });
      }
    });
  });
}

module.exports = {
  createUserMessage,
  createSellerReply,
  emitMartMessageEvents,
  registerMartMessageSocket,
};
