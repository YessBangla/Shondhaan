import { getOrCreateConversation, resolveReceiver } from "../controller/dealConversations.service.js";

// -----------------------------------------------------------------------
// Deal chat socket handlers — matches the confirmed schema:
//   deal_conversations: id, listing_id, buyer_id, seller_id, last_message,
//                        last_message_at, buyer_unread_count,
//                        seller_unread_count, status, created_at, updated_at
//   deal_messages:       id, conversation_id, sender_id, message, is_read,
//                        created_at, type   (no receiver_id column)
//
// Wire this up in your server entrypoint with:
//   import { registerDealChatSocket } from "./sockets/dealChat.js";
//   registerDealChatSocket(io, dealDb);
// -----------------------------------------------------------------------

export function registerDealChatSocket(io, dealDb) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // -------------------------------------------------
    // JOIN USER ROOM
    // -------------------------------------------------
    socket.on("join_user", (userId) => {
      if (!userId) return;
      socket.data.userId = String(userId);
      socket.join(`user:${userId}`);
      console.log(`✅ ${socket.id} joined user:${userId}`);
    });

    // -------------------------------------------------
    // SEND MESSAGE
    // Accepts either an existing conversationId, or a
    // (listingId + receiverId) pair to resolve/create one.
    // -------------------------------------------------
    socket.on("send_message", async (payload, ack) => {
      try {
        const senderId = socket.data.userId;
        const { listingId, receiverId, conversationId, message } = payload || {};

        if (!senderId) {
          return ack?.({ success: false, error: "User not identified — emit join_user first" });
        }
        if (!message?.trim()) {
          return ack?.({ success: false, error: "message is required" });
        }
        if (!conversationId && !listingId) {
          return ack?.({ success: false, error: "conversationId or listingId is required" });
        }

        let conv;
        if (conversationId) {
          const [rows] = await dealDb.query(`SELECT * FROM deal_conversations WHERE id = ?`, [conversationId]);
          conv = rows[0];
          if (!conv) return ack?.({ success: false, error: "Conversation not found" });
        } else {
          if (!receiverId) {
            return ack?.({ success: false, error: "receiverId is required to start a new conversation" });
          }
          conv = await getOrCreateConversation(dealDb, listingId, senderId, receiverId);
        }

        const [result] = await dealDb.query(
          `INSERT INTO deal_messages (conversation_id, sender_id, message, is_read, created_at)
           VALUES (?, ?, ?, 0, NOW())`,
          [conv.id, senderId, message.trim()]
        );

        const { receiverId: actualReceiverId, receiverUnreadColumn } = resolveReceiver(conv, senderId);

        await dealDb.query(
          `UPDATE deal_conversations
           SET last_message = ?, last_message_at = NOW(), ${receiverUnreadColumn} = ${receiverUnreadColumn} + 1, updated_at = NOW()
           WHERE id = ?`,
          [message.trim(), conv.id]
        );

        const saved = {
          id: result.insertId,
          conversation_id: conv.id,
          listing_id: conv.listing_id,
          sender_id: senderId,
          receiver_id: actualReceiverId,
          message: message.trim(),
          is_read: 0,
          created_at: new Date().toISOString(),
        };

        io.to(`user:${actualReceiverId}`).emit("new_message", saved);
        io.to(`user:${senderId}`).emit("new_message", saved);

        ack?.({ success: true, data: saved });
      } catch (err) {
        console.error("❌ send_message error:", err);
        ack?.({ success: false, error: "Failed to send message", details: err.message });
      }
    });

    // -------------------------------------------------
    // MARK AS READ (realtime) — clears the correct side's
    // unread counter and the underlying message rows.
    // -------------------------------------------------
    socket.on("mark_read", async ({ conversationId }) => {
      try {
        const userId = socket.data.userId;
        if (!userId || !conversationId) return;

        const [rows] = await dealDb.query(`SELECT * FROM deal_conversations WHERE id = ?`, [conversationId]);
        const conv = rows[0];
        if (!conv) return;

        const isBuyer = String(conv.buyer_id) === String(userId);
        const unreadCol = isBuyer ? "buyer_unread_count" : "seller_unread_count";
        const otherPartyId = isBuyer ? conv.seller_id : conv.buyer_id;

        await dealDb.query(`UPDATE deal_conversations SET ${unreadCol} = 0 WHERE id = ?`, [conversationId]);
        await dealDb.query(
          `UPDATE deal_messages SET is_read = 1 WHERE conversation_id = ? AND sender_id = ? AND is_read = 0`,
          [conversationId, otherPartyId]
        );

        // Notify the sender of the read messages (for ✓✓), not everyone
        io.to(`user:${otherPartyId}`).emit("messages_read", {
          conversation_id: conversationId,
          reader_id: userId,
        });
      } catch (err) {
        console.error("❌ mark_read error:", err);
      }
    });

    // -------------------------------------------------
    // TYPING INDICATORS — scoped to the other participant
    // only. Client must send otherUserId alongside
    // conversationId (avoids a DB lookup on every keystroke).
    // -------------------------------------------------
    socket.on("typing", ({ conversationId, otherUserId }) => {
      const userId = socket.data.userId;
      if (!userId || !conversationId || !otherUserId) return;
      io.to(`user:${otherUserId}`).emit("typing", {
        conversation_id: conversationId,
        user_id: userId,
      });
    });

    socket.on("stop_typing", ({ conversationId, otherUserId }) => {
      const userId = socket.data.userId;
      if (!userId || !conversationId || !otherUserId) return;
      io.to(`user:${otherUserId}`).emit("stop_typing", {
        conversation_id: conversationId,
        user_id: userId,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}