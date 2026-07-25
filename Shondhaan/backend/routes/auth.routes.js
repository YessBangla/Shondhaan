import { sendOtpEmail } from "../utils/email.js";
import { Router } from "express";
import {
  signupRequestOtp,
  signupVerifyOtp,
  login,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup/request-otp", signupRequestOtp);
router.post("/signup/verify-otp", signupVerifyOtp);
router.post("/login", login);

export default router;