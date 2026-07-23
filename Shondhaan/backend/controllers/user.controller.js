import { pool } from "../db/pool.js";
import { safeUser } from "../utils/users.js";
import { normalizeMobile } from "../utils/normalize.js";

export const getMyProfile = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        u.id,
        u.name,
        u.mobile,
        u.address,
        u.email,
        u.type,
        u.shop_name,
        u.shop_type,
        u.created_at,
        u.updated_at,
        up.profile_image,
        up.bio,
        up.gender,
        up.date_of_birth,
        up.nid_front,
        up.nid_back
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
      [req.user.id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = safeUser(rows[0]);
    res.json({
      ...user,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      profile_image: rows[0].profile_image || null,
      avatar_url: rows[0].profile_image || null,
      bio: rows[0].bio || null,
      gender: rows[0].gender || null,
      date_of_birth: rows[0].date_of_birth || null,
      nid_front: rows[0].nid_front || null,
      nid_back: rows[0].nid_back || null,
      phone: user.mobile || "",
    });
  } catch (error) {
    console.error("Get current user profile error:", error);
    res.status(500).json({ message: "Could not load user profile" });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const name = String(req.body.name ?? "").trim();
    const mobile = normalizeMobile(req.body.mobile ?? req.body.phone ?? "");
    const address = String(req.body.address ?? "").trim();

    // Validation
    if (Object.prototype.hasOwnProperty.call(req.body, "name") && !name) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (mobile && !/^01[3-9]\d{8}$/.test(mobile)) {
      return res.status(400).json({ message: "Valid BD number required" });
    }

    // UPDATE USERS TABLE
    const userFields = [];
    const userValues = [];

    if ("name" in req.body) {
      userFields.push("name = ?");
      userValues.push(name);
    }

    if ("mobile" in req.body || "phone" in req.body) {
      userFields.push("mobile = ?");
      userValues.push(mobile);
    }

    if ("address" in req.body) {
      userFields.push("address = ?");
      userValues.push(address || null);
    }

    if (userFields.length) {
      const [result] = await pool.execute(
        `UPDATE users SET ${userFields.join(", ")} WHERE id = ?`,
        [...userValues, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    // HANDLE IMAGE FILE
    let profileImagePath = null;
    if (req.file) {
      profileImagePath = "/uploads/user-profiles/" + req.file.filename;
    }

    // PROFILE DATA
    const profilePayload = {
      profile_image: profileImagePath || req.body.profile_image,
      bio: req.body.bio,
      gender: req.body.gender,
      date_of_birth: req.body.date_of_birth,
      nid_front: req.body.nid_front,
      nid_back: req.body.nid_back,
    };

    const profileEntries = Object.entries(profilePayload).filter(
      ([, value]) => value !== undefined
    );

    if (profileEntries.length) {
      const values = profileEntries.map(([, value]) =>
        value === null ? null : String(value).trim() || null
      );

      const [profiles] = await pool.execute(
        "SELECT id FROM user_profiles WHERE user_id = ? LIMIT 1",
        [userId]
      );

      if (profiles.length) {
        await pool.execute(
          `UPDATE user_profiles SET ${profileEntries
            .map(([key]) => `${key} = ?`)
            .join(", ")} WHERE id = ?`,
          [...values, profiles[0].id]
        );
      } else {
        const columns = ["user_id", ...profileEntries.map(([key]) => key)];

        await pool.execute(
          `INSERT INTO user_profiles (${columns.join(", ")})
           VALUES (${columns.map(() => "?").join(", ")})`,
          [userId, ...values]
        );
      }
    }

    // RETURN UPDATED USER
    const [rows] = await pool.execute(
      `SELECT u.*, up.*
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profile update failed" });
  }
};