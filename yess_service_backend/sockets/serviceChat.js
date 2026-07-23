import jwt from "jsonwebtoken";
import {
  addMessageRecord,
  createConversationRecord,
  ensureServiceChatSchema,
  getConversationById,
  isStaffUser,
} from "../controller/serviceChat.controller.js";

const JWT_SECRET = process.env.AUTH_TOKEN_SECRET || "secret";

const verifyToken = (token) => {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

export const initServiceChatSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("service-chat:join-staff", ({ token } = {}, ack) => {
      const user = verifyToken(token);
      if (!isStaffUser(user)) {
        ack?.({ ok: false, message: "Staff access required" });
        return;
      }

      socket.join("service-chat:staff");
      ack?.({ ok: true });
    });

    socket.on("service-chat:join-conversation", async ({ conversationId, visitorId, token } = {}, ack) => {
      try {
        const conversation = await getConversationById(conversationId);
        const user = verifyToken(token);
        const allowed =
          isStaffUser(user) ||
          (user?.id && String(conversation?.user_id || "") === String(user.id)) ||
          (visitorId && conversation?.visitor_id && visitorId === conversation.visitor_id);

        if (!conversation || !allowed) {
          ack?.({ ok: false, message: "Not allowed for this conversation" });
          return;
        }

        socket.join(`service-chat:${conversationId}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, message: "Could not join conversation" });
      }
    });

    socket.on("service-chat:conversation:create", async (payload = {}, ack) => {
      try {
        await ensureServiceChatSchema();
        const data = await createConversationRecord({
          ...payload,
          user: verifyToken(payload.token),
        });

        socket.join(`service-chat:${data.conversation.id}`);
        io.to(`service-chat:${data.conversation.id}`).emit("service-chat:message:new", data);
        io.to("service-chat:staff").emit("service-chat:conversation:updated", data);
        ack?.({ ok: true, data });
      } catch (error) {
        ack?.({ ok: false, message: error.message || "Could not start chat" });
      }
    });

    socket.on("service-chat:message:send", async (payload = {}, ack) => {
      try {
        await ensureServiceChatSchema();
        const data = await addMessageRecord({
          conversationId: payload.conversationId,
          message: payload.message,
          visitor_id: payload.visitor_id,
          staffName: payload.sender_name,
          user: verifyToken(payload.token),
        });

        io.to(`service-chat:${data.conversation.id}`).emit("service-chat:message:new", data);
        io.to("service-chat:staff").emit("service-chat:conversation:updated", data);
        ack?.({ ok: true, data });
      } catch (error) {
        ack?.({ ok: false, message: error.message || "Could not send message" });
      }
    });
  });
};
