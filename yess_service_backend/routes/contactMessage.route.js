import express from "express";
import {
  createContactMessage,
  getContactMessages,
} from "../controller/contactMessage.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", createContactMessage);
router.get("/", authMiddleware, getContactMessages);


export default router;