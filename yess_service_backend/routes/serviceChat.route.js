import express from "express";
import {
  createConversation,
  listConversations,
  listMessages,
  sendConversationMessage,
  debugAuth,
} from "../controller/serviceChat.controller.js";

const router = express.Router();

// Debug endpoint - remove in production
router.get("/debug-auth", debugAuth);

router.get("/conversations", listConversations);
router.post("/conversations", createConversation);
router.get("/conversations/:id/messages", listMessages);
router.post("/conversations/:id/messages", sendConversationMessage);

export default router;