const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const pool = require("../db");

const router = express.Router();
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "change-this-secret-in-env";

function verifyToken(token = "") {
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const auth = verifyToken(token);

  if (!auth || !auth.id) {
    return res.status(401).json({ success: false, message: "Login required" });
  }

  req.auth = auth;
  next();
}

function requireProfileOwner(req, res, next) {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: "Valid user id is required" });
  }
  if (req.auth.id !== userId && !["admin", "super_admin"].includes(req.auth.type)) {
    return res.status(403).json({ success: false, message: "You can only update your own profile" });
  }
  req.profileUserId = userId;
  next();
}

function formatProfile(row, auth = {}) {
  return {
    user_id: row?.user_id || auth.id,
    display_name: row?.display_name || auth.name || "",
    phone: row?.phone || auth.mobile || "",
    address: row?.address || auth.address || "",
    profile_image_url: row?.profile_image_url || null,
  };
}

router.get("/:userId", requireAuth, requireProfileOwner, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM user_profile WHERE user_id = ? LIMIT 1", [req.profileUserId]);
    res.json({ success: true, profile: formatProfile(rows[0], req.auth) });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ success: false, message: "Could not load profile" });
  }
});

router.put("/:userId", requireAuth, requireProfileOwner, async (req, res) => {
  try {
    const displayName = String(req.body.display_name || "").trim();
    const phone = String(req.body.phone || "").trim();
    const address = String(req.body.address || "").trim();
    const profileImageUrl =
      req.body.profile_image_url === undefined ? undefined : String(req.body.profile_image_url || "").trim();

    if (!displayName) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (phone && !/^01[3-9]\d{8}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Enter a valid phone number" });
    }

    const columns = ["user_id", "display_name", "phone", "address"];
    const values = [req.profileUserId, displayName, phone || null, address || null];
    const updates = [
      "display_name = VALUES(display_name)",
      "phone = VALUES(phone)",
      "address = VALUES(address)",
    ];

    if (profileImageUrl !== undefined) {
      columns.push("profile_image_url");
      values.push(profileImageUrl || null);
      updates.push("profile_image_url = VALUES(profile_image_url)");
    }

    await pool.query(
      `
        INSERT INTO user_profile (${columns.join(", ")})
        VALUES (${columns.map(() => "?").join(", ")})
        ON DUPLICATE KEY UPDATE ${updates.join(", ")}
      `,
      values
    );

    const [rows] = await pool.query("SELECT * FROM user_profile WHERE user_id = ? LIMIT 1", [req.profileUserId]);
    res.json({ success: true, message: "Profile updated", profile: formatProfile(rows[0], req.auth) });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({ success: false, message: "Could not update profile" });
  }
});

router.post("/:userId/image", requireAuth, requireProfileOwner, async (req, res) => {
  try {
    const image = String(req.body.image || "");
    const match = image.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/i);
    if (!match) {
      return res.status(400).json({ success: false, message: "Valid base64 image is required" });
    }

    const ext = match[1].toLowerCase().replace("jpeg", "jpg");
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Image must be under 2MB" });
    }

    const uploadDir = path.join(__dirname, "..", "uploads", "user-profiles");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `${req.profileUserId}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, fileName), buffer);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8081}`;
    const profileImageUrl = `${baseUrl}/uploads/user-profiles/${fileName}`;

    await pool.query(
      `
        INSERT INTO user_profile (user_id, profile_image_url)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE profile_image_url = VALUES(profile_image_url)
      `,
      [req.profileUserId, profileImageUrl]
    );

    res.status(201).json({
      success: true,
      message: "Profile image uploaded",
      profile_image_url: profileImageUrl,
    });
  } catch (error) {
    console.error("Upload user profile image error:", error);
    res.status(500).json({ success: false, message: "Could not upload profile image" });
  }
});

module.exports = router;
