// import bcrypt from "bcrypt";
// import crypto from "crypto";
// import { pool } from "../config/db.js";
// import { createToken } from "../utils/jwt.js";
// import {
//   ALLOWED_USER_TYPES,
//   findUserByIdentifier,
//   normalizeEmail,
//   normalizeMobile,
//   normalizeUserType,
//   safeUser,
// } from "../services/user.service.js";
// import { verifyPassword } from "../services/auth.service.js";
// import { sendOtpEmail } from "../services/otp.service.js";

// const OTP_LENGTH = 6;
// const DEFAULT_OTP_EXPIRY_MINUTES = 10;

// const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// const ALLOWED_SHOP_TYPES = new Set(["grocery", "electronics", "fashion", "pharmacy", "others"]);

// const createOtp = () => {
//   const min = 10 ** (OTP_LENGTH - 1);
//   const max = 10 ** OTP_LENGTH - 1;
//   return String(crypto.randomInt(min, max + 1));
// };

// const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

// const getOtpExpiryDate = () => {
//   const minutes = Number(process.env.OTP_EXPIRY_MINUTES || DEFAULT_OTP_EXPIRY_MINUTES);
//   return new Date(Date.now() + Math.max(minutes, 1) * 60 * 1000);
// };

// const getSignupConflictMessage = (rows, cleanEmail, cleanMobile) => {
//   const verifiedRows = rows.filter((row) => Boolean(row.email_verified));
//   const emailExists = verifiedRows.some((row) => normalizeEmail(row.email) === cleanEmail);
//   const mobileExists = verifiedRows.some((row) => normalizeMobile(row.mobile) === cleanMobile);

//   if (emailExists && mobileExists) {
//     return "An account already exists with this email and mobile number. Please login instead.";
//   }

//   if (emailExists) {
//     return "This email is already registered. Please login or use another email.";
//   }

//   if (mobileExists) {
//     return "This mobile number is already registered. Please login or use another number.";
//   }

//   return null;
// };

// const findReusableSignupUser = (rows, cleanEmail, cleanMobile) =>
//   rows.find((row) => normalizeEmail(row.email) === cleanEmail) ||
//   rows.find((row) => normalizeMobile(row.mobile) === cleanMobile) ||
//   null;

// /**
//  * STEP 1: REQUEST OTP
//  */
// export const signupRequestOtp = async (req, res) => {
//   let touchedUserId = null;
//   let createdNewUser = false;

//   try {
//     const { name, mobile, email, password } = req.body;
//     const cleanName = String(name || "").trim();
//     const cleanPassword = String(password || "");
//     const cleanEmail = normalizeEmail(email);
//     const cleanMobile = normalizeMobile(mobile);
//     const cleanAddress = String(req.body.address || "").trim();
//     const cleanType = normalizeUserType(req.body.type || "user");
//     const shopName = String(req.body.shop_name || "").trim();
//     const shopType = String(req.body.shop_type || "").trim();

//     if (!cleanName || !cleanMobile || !cleanEmail || !cleanPassword) {
//       return res.status(400).json({ message: "Name, mobile, email and password are required" });
//     }

//     if (!isValidEmail(cleanEmail)) {
//       return res.status(400).json({ message: "A valid email address is required" });
//     }

//     if (!/^01[3-9]\d{8}$/.test(cleanMobile)) {
//       return res.status(400).json({ message: "A valid Bangladesh mobile number is required" });
//     }

//     if (cleanPassword.length < 8) {
//       return res.status(400).json({ message: "Password must be at least 8 characters" });
//     }

//     if (!ALLOWED_USER_TYPES.has(cleanType)) {
//       return res.status(400).json({ message: "Valid account type is required" });
//     }

//     if (cleanType === "mart_vendor" && !shopName) {
//       return res.status(400).json({ message: "Shop name is required for mart vendor signup" });
//     }

//     if (cleanType === "mart_vendor" && !ALLOWED_SHOP_TYPES.has(shopType)) {
//       return res.status(400).json({ message: "Valid shop type is required for mart vendor signup" });
//     }

//     const [existing] = await pool.execute(
//       "SELECT id, email, mobile, email_verified FROM users WHERE email = ? OR mobile = ?",
//       [cleanEmail, cleanMobile]
//     );

//     const conflictMessage = getSignupConflictMessage(existing, cleanEmail, cleanMobile);

//     if (conflictMessage) {
//       return res.status(409).json({ message: conflictMessage });
//     }

//     const existingUser = findReusableSignupUser(existing, cleanEmail, cleanMobile);

//     // generate otp
//     const otp = createOtp();

//     const otpHash = hashOtp(otp);

//     const otpExpires = getOtpExpiryDate();

//     // hash password
//     const hashedPassword = await bcrypt.hash(cleanPassword, 10);

//     if (existingUser) {
//       await pool.execute(
//         `UPDATE users
//          SET name = ?, mobile = ?, address = ?, email = ?, password = ?, type = ?, shop_name = ?, shop_type = ?, otp_hash = ?, otp_expires_at = ?, email_verified = 0
//          WHERE id = ?`,
//         [
//           cleanName,
//           cleanMobile,
//           cleanAddress || null,
//           cleanEmail,
//           hashedPassword,
//           cleanType,
//           shopName || null,
//           cleanType === "mart_vendor" ? shopType : null,
//           otpHash,
//           otpExpires,
//           existingUser.id,
//         ]
//       );
//       touchedUserId = existingUser.id;
//     } else {
//       const [result] = await pool.execute(
//         `INSERT INTO users
//         (name, mobile, address, email, password, type, shop_name, shop_type, otp_hash, otp_expires_at, email_verified)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
//         [
//           cleanName,
//           cleanMobile,
//           cleanAddress || null,
//           cleanEmail,
//           hashedPassword,
//           cleanType,
//           shopName || null,
//           cleanType === "mart_vendor" ? shopType : null,
//           otpHash,
//           otpExpires,
//         ]
//       );
//       touchedUserId = result.insertId;
//       createdNewUser = true;
//     }

//     await sendOtpEmail({ to: cleanEmail, otp });

//     return res.json({
//       message: "OTP sent successfully (check your email)",
//     });
//   } catch (err) {
//     console.error(err);

//     if (touchedUserId) {
//       try {
//         if (createdNewUser) {
//           await pool.execute(
//             "DELETE FROM users WHERE id = ? AND email_verified = 0",
//             [touchedUserId]
//           );
//         } else {
//           await pool.execute(
//             "UPDATE users SET otp_hash = NULL, otp_expires_at = NULL WHERE id = ? AND email_verified = 0",
//             [touchedUserId]
//           );
//         }
//       } catch (cleanupError) {
//         console.error("OTP cleanup failed:", cleanupError);
//       }
//     }

//     const isSmtpError =
//       err?.message?.includes("SMTP") ||
//       err?.code === "EAUTH" ||
//       err?.code === "ECONNECTION" ||
//       err?.code === "ETIMEDOUT" ||
//       err?.code === "ESOCKET";

//     return res.status(isSmtpError ? 502 : 500).json({
//       message: isSmtpError
//         ? "Could not send OTP email. Please check SMTP settings and try again."
//         : "OTP request failed",
//       error: process.env.NODE_ENV === "production" ? undefined : err.message,
//     });
//   }
// };

// /**
//  * STEP 2: VERIFY OTP
//  */
// export const verifyOtp = async (req, res) => {
//   try {
//     const { email, otp } = req.body;
//     const cleanEmail = normalizeEmail(email);

//     if (!cleanEmail || !otp) {
//       return res.status(400).json({ message: "Email and OTP are required" });
//     }

//     const [rows] = await pool.execute(
//       "SELECT * FROM users WHERE email = ? LIMIT 1",
//       [cleanEmail]
//     );

//     const user = rows[0];

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const otpHash = hashOtp(otp);

//     if (
//       !user.otp_hash ||
//       !user.otp_expires_at ||
//       user.otp_hash !== otpHash ||
//       new Date(user.otp_expires_at) < new Date()
//     ) {
//       return res.status(400).json({ message: "Invalid or expired OTP" });
//     }

//     // verify user
//     await pool.execute(
//       "UPDATE users SET email_verified = 1, otp_hash = NULL, otp_expires_at = NULL WHERE id = ?",
//       [user.id]
//     );

//     const verifiedUser = safeUser({ ...user, email_verified: 1 });
//     const token = createToken(verifiedUser);

//     return res.json({
//       message: "Account verified successfully",
//       user: verifiedUser,
//       token,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "OTP verification failed" });
//   }
// };

// /**
//  * LOGIN
//  */
// export const login = async (req, res) => {
//   try {
//     const { identifier, password } = req.body;
// console.log("Signup OTP Payload:", req.body);
//     const user = await findUserByIdentifier(identifier);

//     if (!user) {
//       return res.status(401).json({ message: "Invalid login" });
//     }

//     const isMatch = await verifyPassword(password, user.password);

//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid login" });
//     }

//     if (!user.email_verified) {
//       return res.status(403).json({ message: "Please verify your email OTP before login" });
//     }

//     const authUser = safeUser(user);
//     const token = createToken(authUser);
//     console.log("✅ VERIFY OTP TOKEN GENERATED:", token);
// console.log("👤 USER:", verifiedUser);

//     return res.json({
//       user: authUser,
//       token,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "Login failed" });
//   }
// };
