import crypto from "node:crypto";
import { pool } from "../db/pool.js";
import { hashPassword, validatePasswordPolicy } from "../utils/crypto.js";
import { normalizeEmail } from "../utils/normalize.js";
import { sendResetPasswordEmail } from "../utils/email.js";
import { passwordPolicyMessage } from "../config/constants.js";

const RESET_EXPIRY_MINUTES = 15; // separate from OTP_EXPIRY_MINUTES; adjust if you want to reuse it
const FRONTEND_URL = (process.env.FRONTEND_URL || "").split(",")[0];

export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const [rows] = await pool.execute("SELECT id, email FROM users WHERE email = ? LIMIT 1", [email]);

    // Always respond the same way so we don't leak which emails are registered
    if (!rows.length) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

    await pool.execute(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt],
    );

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
    sendResetPasswordEmail(user.email, resetLink).catch(console.error);

    return res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(500).json({ message: "Could not process request" });
  }
};

export const verifyResetToken = async (req, res) => {
  try {
    const token = String(req.query.token || "");
    if (!token) return res.status(400).json({ valid: false });

    const [rows] = await pool.execute(
      "SELECT id FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW() LIMIT 1",
      [token],
    );

    return res.json({ valid: rows.length > 0 });
  } catch (error) {
    console.error("verifyResetToken error:", error);
    return res.status(500).json({ valid: false });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }
    if (!validatePasswordPolicy(password)) {
      return res.status(400).json({ message: passwordPolicyMessage });
    }

    const [rows] = await pool.execute(
      "SELECT id, user_id FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW() LIMIT 1",
      [token],
    );
    if (!rows.length) {
      return res.status(400).json({ message: "Reset link is invalid or has expired" });
    }

    const reset = rows[0];
    const passwordHash = await hashPassword(password);

    await pool.execute("UPDATE users SET password = ? WHERE id = ?", [passwordHash, reset.user_id]);
    await pool.execute("UPDATE password_resets SET used = 1 WHERE id = ?", [reset.id]);

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ message: "Could not reset password" });
  }
};