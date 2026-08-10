import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../config/db.js";

// Read the secret directly from the environment variables
const JWT_SECRET = process.env.JWT_SECRET || "fallback_dev_secret";

if (JWT_SECRET === "fallback_dev_secret") {
  console.warn("[ChatController] WARNING: JWT_SECRET is not found in .env! Falling back to insecure default.");
}

const STAFF_ROLES = new Set(["call_center", "admin", "super_admin", "service_admin"]);

const clean = (value, fallback = "") => String(value ?? fallback).trim();

export const ensureServiceChatSchema = async () => {
  console.log("[Schema] Ensuring service chat schema exists...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_chat_conversations (
      id CHAR(36) PRIMARY KEY,
      visitor_id VARCHAR(120) NULL,
      user_id VARCHAR(120) NULL,
      user_name VARCHAR(255) NULL,
      user_email VARCHAR(255) NULL,
      user_phone VARCHAR(80) NULL,
      subject VARCHAR(255) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'open',
      last_message TEXT NULL,
      last_message_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_service_chat_visitor (visitor_id),
      INDEX idx_service_chat_user (user_id),
      INDEX idx_service_chat_last_message_at (last_message_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_chat_messages (
      id CHAR(36) PRIMARY KEY,
      conversation_id CHAR(36) NOT NULL,
      sender_role VARCHAR(40) NOT NULL,
      sender_id VARCHAR(120) NULL,
      sender_name VARCHAR(255) NULL,
      body TEXT NOT NULL,
      read_by_staff TINYINT(1) NOT NULL DEFAULT 0,
      read_by_customer TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_service_chat_messages_conversation (conversation_id),
      CONSTRAINT fk_service_chat_messages_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES service_chat_conversations(id)
        ON DELETE CASCADE
    )
  `);
  console.log("[Schema] Schema check complete.");
};

export const getBearerUser = (req) => {
  console.log("--- getBearerUser Initiated ---");
  
  // 1. Try to get token from req.cookies (requires cookie-parser middleware)
  let cookieToken = req.cookies?.token;

  // 2. Fallback: Manually parse the cookie header if cookie-parser isn't installed
  if (!cookieToken && req.headers.cookie) {
    const rawCookies = req.headers.cookie.split('; ').reduce((acc, c) => {
      const [key, val] = c.split('=');
      acc[key] = val;
      return acc;
    }, {});
    cookieToken = rawCookies.token;
  }

  if (cookieToken) {
    console.log("Token found in cookie. Attempting to verify...");
    try {
      const decoded = jwt.verify(cookieToken, JWT_SECRET);
      console.log("Cookie token SUCCESSFULLY verified:", decoded);
      return decoded;
    } catch (err) {
      console.error("Cookie token verification FAILED:", err.message);
      return null;
    }
  } else {
    console.log("No token found in cookies.");
  }

  // 3. Fallback to Authorization header for API clients/Postman
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    console.log("No valid Bearer header found.");
    return null;
  }

  console.log("Bearer token found in headers. Attempting to verify...");
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Bearer token SUCCESSFULLY verified:", decoded);
    return decoded;
  } catch (err) {
    console.error("Bearer token verification FAILED:", err.message);
    return null;
  }
};

export const isStaffUser = (user) => {
  const role = String(user?.type || user?.role || "");
  const isStaff = STAFF_ROLES.has(role);
  console.log(`[isStaffUser] Checking role: "${role}". Is Staff? ${isStaff}`);
  return isStaff;
};

export const normalizeConversation = (row) => ({
  ...row,
  unread_count: Number(row.unread_count || 0),
  is_logged_in_user: Boolean(row.user_id),
});

export const normalizeMessage = (row) => ({
  ...row,
  read_by_staff: Boolean(row.read_by_staff),
  read_by_customer: Boolean(row.read_by_customer),
});

export const getConversationById = async (id) => {
  console.log(`[DB] Fetching conversation by ID: ${id}`);
  const [rows] = await pool.execute(
    `SELECT * FROM service_chat_conversations WHERE id = ? LIMIT 1`,
    [id]
  );

  return rows[0] || null;
};

const ensureParticipantCanRead = (req, conversation) => {
  console.log("[Auth] Ensuring participant can read...");
  const user = getBearerUser(req);
  if (isStaffUser(user)) {
    console.log("[Auth] Access granted: Staff.");
    return { ok: true, user, staff: true };
  }

  const visitorId = clean(req.query.visitor_id || req.body?.visitor_id);
  if (user?.id && String(conversation.user_id || "") === String(user.id)) {
    console.log("[Auth] Access granted: Matches user ID.");
    return { ok: true, user, staff: false };
  }

  if (visitorId && conversation.visitor_id && visitorId === conversation.visitor_id) {
    console.log("[Auth] Access granted: Matches visitor ID.");
    return { ok: true, user, staff: false };
  }

  console.warn("[Auth] Access DENIED.");
  return { ok: false, user, staff: false };
};

const emitChatUpdate = (req, payload) => {
  const io = req.app.get("io");
  if (!io) {
    console.log("[Socket] No IO instance found on app.");
    return;
  }

  console.log("[Socket] Emitting chat update for conversation:", payload.conversation.id);
  io.to(`service-chat:${payload.conversation.id}`).emit("service-chat:message:new", payload);
  io.to("service-chat:staff").emit("service-chat:conversation:updated", payload);
};

export const createConversationRecord = async ({
  message,
  visitor_id,
  user,
  user_name,
  user_email,
  user_phone,
  subject,
}) => {
  console.log("[Service] Creating conversation record...");
  const body = clean(message);
  if (!body) {
    const error = new Error("Message is required");
    error.status = 400;
    throw error;
  }

  const conversationId = uuidv4();
  const messageId = uuidv4();
  const finalName = clean(user_name || user?.name || user?.email, user?.id ? "Customer" : "Anonymous");
  const finalEmail = clean(user_email || user?.email) || null;
  const finalUserId = user?.id ? String(user.id) : null;

  await pool.execute(
    `
    INSERT INTO service_chat_conversations (
      id, visitor_id, user_id, user_name, user_email, user_phone, subject,
      last_message, last_message_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      conversationId,
      clean(visitor_id) || null,
      finalUserId,
      finalName,
      finalEmail,
      clean(user_phone || user?.mobile) || null,
      clean(subject, "Service support") || "Service support",
      body,
    ]
  );

  await pool.execute(
    `
    INSERT INTO service_chat_messages (
      id, conversation_id, sender_role, sender_id, sender_name, body, read_by_customer
    )
    VALUES (?, ?, 'customer', ?, ?, ?, 1)
    `,
    [messageId, conversationId, finalUserId || clean(visitor_id) || null, finalName, body]
  );

  const conversation = await getConversationById(conversationId);
  const [messages] = await pool.execute(
    `SELECT * FROM service_chat_messages WHERE id = ? LIMIT 1`,
    [messageId]
  );

  console.log("[Service] Conversation record created successfully.");
  return {
    conversation: normalizeConversation(conversation),
    message: normalizeMessage(messages[0]),
  };
};

export const addMessageRecord = async ({ conversationId, message, visitor_id, user, staffName }) => {
  console.log(`[Service] Adding message record to conversation: ${conversationId}`);
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    const error = new Error("Conversation not found");
    error.status = 404;
    throw error;
  }

  const body = clean(message);
  if (!body) {
    const error = new Error("Message is required");
    error.status = 400;
    throw error;
  }

  const staff = isStaffUser(user);
  if (!staff) {
    const matchesUser = user?.id && String(conversation.user_id || "") === String(user.id);
    const matchesVisitor =
      clean(visitor_id) && conversation.visitor_id && clean(visitor_id) === conversation.visitor_id;

    if (!matchesUser && !matchesVisitor) {
      const error = new Error("Not allowed for this conversation");
      error.status = 403;
      throw error;
    }
  }

  const messageId = uuidv4();
  const senderRole = staff ? "staff" : "customer";
  const senderId = staff ? String(user.id) : user?.id ? String(user.id) : clean(visitor_id) || null;
  const senderName = staff
    ? clean(staffName || user?.name || user?.email, "Support")
    : clean(conversation.user_name, "Anonymous");

  await pool.execute(
    `
    INSERT INTO service_chat_messages (
      id, conversation_id, sender_role, sender_id, sender_name, body,
      read_by_staff, read_by_customer
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      messageId,
      conversationId,
      senderRole,
      senderId,
      senderName,
      body,
      staff ? 1 : 0,
      staff ? 0 : 1,
    ]
  );

  await pool.execute(
    `
    UPDATE service_chat_conversations
    SET last_message = ?, last_message_at = NOW(), status = 'open'
    WHERE id = ?
    `,
    [body, conversationId]
  );

  const updatedConversation = await getConversationById(conversationId);
  const [messages] = await pool.execute(
    `SELECT * FROM service_chat_messages WHERE id = ? LIMIT 1`,
    [messageId]
  );

  console.log("[Service] Message record added successfully.");
  return {
    conversation: normalizeConversation(updatedConversation),
    message: normalizeMessage(messages[0]),
  };
};

export const createConversation = async (req, res) => {
  console.log("=== POST /conversations Request Received ===");
  try {
    const payload = await createConversationRecord({
      ...req.body,
      user: getBearerUser(req),
    });

    emitChatUpdate(req, payload);
    return res.status(201).json({ data: payload });
  } catch (error) {
    console.error("[Controller] Create Conversation Error:", error.message);
    return res.status(error.status || 500).json({
      message: error.message || "Could not create chat conversation",
    });
  }
};

export const listConversations = async (req, res) => {
  console.log("=== GET /conversations Request Received ===");
  try {
    const user = getBearerUser(req);
    
    if (!isStaffUser(user)) {
      console.warn("[Controller] Access denied to listConversations. User is not staff.");
      return res.status(403).json({ message: "Staff access required" });
    }

    console.log("[Controller] Fetching conversations from DB...");
    const [rows] = await pool.execute(`
      SELECT
        c.*,
        SUM(CASE WHEN m.sender_role = 'customer' AND m.read_by_staff = 0 THEN 1 ELSE 0 END) AS unread_count
      FROM service_chat_conversations c
      LEFT JOIN service_chat_messages m ON m.conversation_id = c.id
      GROUP BY c.id
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    `);

    console.log(`[Controller] Found ${rows.length} conversations.`);
    return res.json({ data: rows.map(normalizeConversation) });
  } catch (error) {
    console.error("[Controller] List Conversations Error:", error);
    return res.status(500).json({ message: "Could not load conversations" });
  }
};

export const listMessages = async (req, res) => {
  console.log(`=== GET /conversations/${req.params.id}/messages Request Received ===`);
  try {
    const conversation = await getConversationById(req.params.id);
    if (!conversation) {
      console.warn("[Controller] Conversation not found.");
      return res.status(404).json({ message: "Conversation not found" });
    }

    const access = ensureParticipantCanRead(req, conversation);
    if (!access.ok) {
      console.warn("[Controller] Participant access denied.");
      return res.status(403).json({ message: "Not allowed for this conversation" });
    }

    if (access.staff) {
      console.log("[Controller] Marking messages as read by staff...");
      await pool.execute(
        `UPDATE service_chat_messages SET read_by_staff = 1 WHERE conversation_id = ? AND sender_role = 'customer'`,
        [conversation.id]
      );
    } else {
      console.log("[Controller] Marking messages as read by customer...");
      await pool.execute(
        `UPDATE service_chat_messages SET read_by_customer = 1 WHERE conversation_id = ? AND sender_role = 'staff'`,
        [conversation.id]
      );
    }

    const [messages] = await pool.execute(
      `
      SELECT *
      FROM service_chat_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      `,
      [conversation.id]
    );

    console.log(`[Controller] Found ${messages.length} messages.`);
    return res.json({
      data: {
        conversation: normalizeConversation(conversation),
        messages: messages.map(normalizeMessage),
      },
    });
  } catch (error) {
    console.error("[Controller] List Messages Error:", error);
    return res.status(500).json({ message: "Could not load messages" });
  }
};

export const sendConversationMessage = async (req, res) => {
  console.log(`=== POST /conversations/${req.params.id}/messages Request Received ===`);
  try {
    const payload = await addMessageRecord({
      conversationId: req.params.id,
      message: req.body.message,
      visitor_id: req.body.visitor_id,
      staffName: req.body.sender_name,
      user: getBearerUser(req),
    });

    emitChatUpdate(req, payload);
    return res.status(201).json({ data: payload });
  } catch (error) {
    console.error("[Controller] Send Message Error:", error.message);
    return res.status(error.status || 500).json({
      message: error.message || "Could not send chat message",
    });
  }
};
