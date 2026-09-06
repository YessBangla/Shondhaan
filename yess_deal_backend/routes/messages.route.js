import express from "express";
import { getOrCreateConversation } from "../controller/dealConversations.service.js";

export default function createMessagesRouter(dealDb) {
  const router = express.Router();

  // GET MESSAGES

  router.get("/", async (req, res) => {
    try {
      const { conversationId, unread } = req.query;

      if (!conversationId) {
        return res.status(400).json({ success: false, message: "conversationId is required" });
      }

      const clauses = ["conversation_id = ?"];
      const params = [conversationId];

      if (unread === "true") clauses.push("is_read = 0");

      const [rows] = await dealDb.query(
        `SELECT * FROM deal_messages
         WHERE ${clauses.join(" AND ")}
         ORDER BY created_at DESC`,
        params
      );

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error("GET messages error:", error);
      res.status(500).json({ success: false, message: "Failed to load messages" });
    }
  });

  // -------------------------------------------------------
  // THREAD
  // -------------------------------------------------------
  router.get("/thread", async (req, res) => {
    try {
      const { conversationId, userId } = req.query;

      if (!conversationId || !userId) {
        return res.status(400).json({ success: false, message: "conversationId and userId required" });
      }

      const [[conv]] = await dealDb.query(
        `SELECT * FROM deal_conversations WHERE id = ?`,
        [conversationId]
      );

      if (!conv) return res.json({ success: true, data: [] });

      const [rows] = await dealDb.query(
        `SELECT * FROM deal_messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`,
        [conversationId]
      );

      const data = rows.map((m) => ({
        ...m,
        listing_id: conv.listing_id,
        receiver_id:
          String(m.sender_id) === String(conv.buyer_id)
            ? conv.seller_id
            : conv.buyer_id,
      }));

      const isBuyer = String(conv.buyer_id) === String(userId);
      const unreadCol = isBuyer ? "buyer_unread_count" : "seller_unread_count";
      const otherId = isBuyer ? conv.seller_id : conv.buyer_id;

      await dealDb.query(
        `UPDATE deal_conversations SET ${unreadCol} = 0 WHERE id = ?`,
        [conversationId]
      );

      await dealDb.query(
        `UPDATE deal_messages
         SET is_read = 1
         WHERE conversation_id = ?
         AND sender_id = ?
         AND is_read = 0`,
        [conversationId, otherId]
      );

      res.json({ success: true, data });
    } catch (error) {
      console.error("THREAD error:", error);
      res.status(500).json({ success: false, message: "Failed to load thread" });
    }
  });

  // -------------------------------------------------------
  // CONVERSATIONS
  // -------------------------------------------------------
  router.get("/conversations", async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ success: false, message: "userId is required" });
      }

const [rows] = await dealDb.query(
`
SELECT
  c.id AS conversation_id,
  c.listing_id,

  CASE 
    WHEN c.buyer_id = ?
    THEN c.seller_id
    ELSE c.buyer_id
  END AS other_user_id,

  dl.title AS listing_title,
  COALESCE(dl.seller_name, CASE
    WHEN c.buyer_id = ? THEN c.seller_id
    ELSE c.buyer_id
  END) AS other_user_name,

  (SELECT li.image_url
   FROM deal_listing_images li
   WHERE li.listing_id = c.listing_id
   ORDER BY li.sort_order ASC, li.id ASC
   LIMIT 1) AS listing_image,

  c.last_message,
  c.last_message_at,

  CASE
    WHEN c.buyer_id = ?
    THEN c.buyer_unread_count
    ELSE c.seller_unread_count
  END AS unread_count

FROM deal_conversations c

JOIN deal_listings dl
ON dl.id = c.listing_id

WHERE c.buyer_id = ?
OR c.seller_id = ?

ORDER BY c.last_message_at DESC
`,
[
 userId,
 userId,
 userId,
 userId,
 userId
]
);

      const data = rows.map((r) => {
        return {
          conversation_id: r.conversation_id,
          listing_id: r.listing_id,
          other_user_id: r.other_user_id,
          listing_title: r.listing_title,
          listing_image: r.listing_image || null,
          other_user_name: r.other_user_name || r.other_user_id,
          last_message: r.last_message,
          last_message_at: r.last_message_at,
          unread_count: Number(r.unread_count) || 0,
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("CONVERSATIONS error:", error);
      res.status(500).json({ success: false, message: "Failed to load conversations" });
    }
  });

  // -------------------------------------------------------
  // CREATE / GET CONVERSATION
  // -------------------------------------------------------
  router.post("/conversation", async (req, res) => {
    try {
      const { listingId, userId, otherUserId } = req.body;

      if (!listingId || !userId || !otherUserId) {
        return res.status(400).json({ success: false, message: "Missing fields" });
      }

      const conv = await getOrCreateConversation(dealDb, listingId, userId, otherUserId);

      if (!conv) {
        return res.status(500).json({ success: false, message: "Failed to create conversation" });
      }

      res.json({ success: true, data: conv });
    } catch (error) {
      console.error("CREATE CONVERSATION error:", error);
      res.status(500).json({ success: false, message: "Failed to resolve conversation" });
    }
  });

  // -------------------------------------------------------
  // SEND MESSAGE
  // -------------------------------------------------------
  router.post("/", async (req, res) => {
    try {
      const { conversationId, listingId, senderId, receiverId, message } = req.body;

      if ((!conversationId && !listingId) || !senderId || !message?.trim()) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      let conv;

      if (conversationId) {
        const [[row]] = await dealDb.query(
          `SELECT * FROM deal_conversations WHERE id = ?`,
          [conversationId]
        );
        conv = row;
      } else {
        if (!receiverId) {
          return res.status(400).json({ success: false, message: "receiverId required" });
        }
        conv = await getOrCreateConversation(dealDb, listingId, senderId, receiverId);
      }

      if (!conv) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
      }

      const [result] = await dealDb.query(
        `INSERT INTO deal_messages (conversation_id, sender_id, message, is_read, created_at)
         VALUES (?, ?, ?, 0, NOW())`,
        [conv.id, senderId, message.trim()]
      );

      const isBuyer = String(conv.buyer_id) === String(senderId);
      const receiver = isBuyer ? conv.seller_id : conv.buyer_id;
      const unreadCol = isBuyer ? "seller_unread_count" : "buyer_unread_count";

      await dealDb.query(
        `UPDATE deal_conversations
         SET last_message = ?, last_message_at = NOW(),
             ${unreadCol} = ${unreadCol} + 1
         WHERE id = ?`,
        [message.trim(), conv.id]
      );

      res.status(201).json({
        success: true,
        data: {
          id: result.insertId,
          conversation_id: conv.id,
          listing_id: conv.listing_id,
          sender_id: senderId,
          receiver_id: receiver,
          message: message.trim(),
          is_read: 0,
          created_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("SEND MESSAGE error:", error);
      res.status(500).json({ success: false, message: "Failed to send message" });
    }
  });


  return router;
}


