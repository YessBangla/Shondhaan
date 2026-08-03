import crypto from "node:crypto";
import { pool } from "../db/pool.js";
import { ALLOWED_ROLES, passwordPolicyMessage } from "../config/constants.js";
import { hashPassword, verifyPassword, hashValue, validatePasswordPolicy } from "../utils/crypto.js";
import { createToken } from "../utils/jwt.js";
import { normalizeEmail, normalizeMobile } from "../utils/normalize.js";
import { safeUser } from "../utils/users.js";
import { sendOtpEmail } from "../utils/email.js";
import { OTP_EXPIRY_MINUTES } from "../config/env.js";

// export const signupRequestOtp = async (req, res) => {
//   try {
//     const name = String(req.body.name || "").trim();
//     const mobile = normalizeMobile(req.body.mobile);
//     const address = String(req.body.address || "").trim();
//     const email = normalizeEmail(req.body.email);
//     const password = String(req.body.password || "");
//     const type = String(req.body.type || "user").trim();

//     if (!name || !email || !mobile) {
//       return res.status(400).json({ message: "Name, mobile and email are required" });
//     }
//     if (!validatePasswordPolicy(password)) {
//       return res.status(400).json({ message: passwordPolicyMessage });
//     }
//     if (!ALLOWED_ROLES.has(type)) {
//       return res.status(400).json({ message: "Valid account type is required" });
//     }

//     const passwordHash = await hashPassword(password);
//     const otp = String(crypto.randomInt(100000, 999999));
//     const otpHash = hashValue(otp);
//     const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

//     const [existing] = await pool.execute("SELECT id, email_verified FROM users WHERE email = ? OR mobile = ? LIMIT 1", [
//       email,
//       mobile,
//     ]);

//     if (existing.length && existing[0].email_verified) {
//       return res.status(409).json({ message: "An account already exists with this email or mobile" });
//     }

//     if (existing.length) {
//       await pool.execute(
//         "UPDATE users SET name = ?, mobile = ?, address = ?, email = ?, password = ?, type = ?, otp_hash = ?, otp_expires_at = ? WHERE id = ?",
//         [name, mobile, address || null, email, passwordHash, type, otpHash, expiresAt, existing[0].id],
//       );
//     } else {
//       await pool.execute(
//         "INSERT INTO users (name, mobile, address, email, password, type, otp_hash, otp_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
//         [name, mobile, address || null, email, passwordHash, type, otpHash, expiresAt],
//       );
//     }

// sendOtpEmail(email, otp).catch(console.error);
// res.json({ message: "OTP sent" });
//   } catch (error) {
//     console.error("Signup OTP error:", error);
//     const message =
//       error.code === "SMTP_CONFIG_MISSING"
//         ? error.message
//         : "Could not send OTP email. Please check SMTP settings.";
//     res.status(500).json({ message });
//   }
// };


export const signupRequestOtp = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const mobile = normalizeMobile(req.body.mobile);
    const address = String(req.body.address || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const type = String(req.body.type || "user").trim();

    // 👈 Check if we should include the password in the email (Call Center flow)
    const sendPasswordInEmail = req.body.sendPasswordInEmail === true;

    if (!name || !email || !mobile) {
      return res.status(400).json({ message: "Name, mobile and email are required" });
    }
    if (!validatePasswordPolicy(password)) {
      return res.status(400).json({ message: passwordPolicyMessage });
    }
    if (!ALLOWED_ROLES.has(type)) {
      return res.status(400).json({ message: "Valid account type is required" });
    }

    const passwordHash = await hashPassword(password);
    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = hashValue(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const [existing] = await pool.execute("SELECT id, email_verified FROM users WHERE email = ? OR mobile = ? LIMIT 1", [
      email,
      mobile,
    ]);

    if (existing.length && existing[0].email_verified) {
      return res.status(409).json({ message: "An account already exists with this email or mobile" });
    }

    if (existing.length) {
      await pool.execute(
        "UPDATE users SET name = ?, mobile = ?, address = ?, email = ?, password = ?, type = ?, otp_hash = ?, otp_expires_at = ? WHERE id = ?",
        [name, mobile, address || null, email, passwordHash, type, otpHash, expiresAt, existing[0].id],
      );
    } else {
      await pool.execute(
        "INSERT INTO users (name, mobile, address, email, password, type, otp_hash, otp_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, mobile, address || null, email, passwordHash, type, otpHash, expiresAt],
      );
    }
    
    // 👈 Only pass the password if the flag is true, otherwise pass null
    sendOtpEmail(email, otp, sendPasswordInEmail ? password : null).catch(console.error);
    
    res.json({ message: "OTP sent" });
  } catch (error) {
    console.error("Signup OTP error:", error);
    const message =
      error.code === "SMTP_CONFIG_MISSING"
        ? error.message
        : "Could not send OTP email. Please check SMTP settings.";
    res.status(500).json({ message });
  }
};
export const signupVerifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Valid email and 6-digit OTP are required" });
    }

    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    const user = rows[0];

    if (!user || user.otp_hash !== hashValue(otp)) {
      return res.status(400).json({ message: "Invalid OTP code" });
    }

    if (!user.otp_expires_at || new Date(user.otp_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    await pool.execute(
      "UPDATE users SET email_verified = 1, otp_hash = NULL, otp_expires_at = NULL WHERE id = ?",
      [user.id],
    );

    const verifiedUser = safeUser({ ...user, email_verified: 1, type: user.type || user.role || "user" });
    res.json({ message: "Account verified", user: verifiedUser, token: createToken(verifiedUser) });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Could not verify OTP" });
  }
};

export const login = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    const password = String(req.body.password || "");

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email/mobile and password are required" });
    }

    const isEmailLogin = identifier.includes("@");
    const normalizedIdentifier = isEmailLogin ? normalizeEmail(identifier) : normalizeMobile(identifier);
    const [rows] = await pool.execute(
      isEmailLogin
        ? "SELECT * FROM users WHERE email = ? LIMIT 1"
        : "SELECT * FROM users WHERE mobile = ? LIMIT 1",
      [normalizedIdentifier],
    );
    const user = rows[0];

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ message: "Invalid login details" });
    }

    if (!user.email_verified) {
      return res.status(403).json({ message: "Please verify your email OTP before login" });
    }

    const authUser = safeUser(user);

    // Create token
    const token = createToken(authUser);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // change to true in production (HTTPS)
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Login successful", user: authUser, token });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};