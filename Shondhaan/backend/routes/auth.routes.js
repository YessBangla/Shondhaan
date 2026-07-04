import express from "express";
import { signupRequestOtp, verifyOtp, login } from "../controllers/auth.controller.js";
import { logout } from "../controllers/logout.controller.js";

import { requireAuth } from "../middleware/tokenBlacklist.middleware.js";

const router = express.Router();

router.post("/signup/request-otp", signupRequestOtp);
router.post("/signup/verify-otp", verifyOtp);
router.post("/login", login);

// Real logout (JWT blacklist)
router.post("/logout", requireAuth, logout);

export default router;
