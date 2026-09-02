// routes/passwordReset.js
import express from "express";
import { forgotPassword, verifyResetToken, resetPassword } from "../controllers/passwordReset.js";

const router = express.Router();

router.post("/forgot-password", forgotPassword);
router.get("/verify-reset-token", verifyResetToken);
router.post("/reset-password", resetPassword);

export default router;