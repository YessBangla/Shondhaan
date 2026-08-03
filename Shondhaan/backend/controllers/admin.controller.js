import { pool } from "../db/pool.js";
import { ALLOWED_ROLES } from "../config/constants.js";
import { hashPassword } from "../utils/crypto.js";
import { normalizeEmail, normalizeMobile } from "../utils/normalize.js";
import { safeAdminUser } from "../utils/users.js";

export const createUser = async (req, res) => {
  try {
    console.log("Create user request:", { name: req.body.name, email: req.body.email, type: req.body.type, auth: req.auth?.type });
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email || "");
    const mobile = normalizeMobile(req.body.mobile || "");
    const password = String(req.body.password || "");
    const type = String(req.body.type || "user").trim();

    if (!name || !email || !mobile || password.length < 6) {
      return res.status(400).json({ message: "Name, mobile, email and 6+ character password are required" });
    }
    if (!ALLOWED_ROLES.has(type)) {
      return res.status(400).json({ message: `Valid type is required. Got: ${type}. Allowed: ${Array.from(ALLOWED_ROLES).join(", ")}` });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ? OR mobile = ? LIMIT 1",
      [email, mobile],
    );
    if (existing.length) {
      return res.status(409).json({ message: "A user already exists with this email or mobile" });
    }

    const passwordHash = await hashPassword(password);
    console.log("Inserting user:", { name, mobile, email, type });
    await pool.execute(
      "INSERT INTO users (name, mobile, address, email, password, type, email_verified) VALUES (?, ?, NULL, ?, ?, ?, 1)",
      [name, mobile, email, passwordHash, type],
    );

    const [rows] = await pool.execute(
      "SELECT id, name, mobile, address, email, type, email_verified, created_at, updated_at FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    console.log("User created successfully:", rows[0]);
    res.status(201).json({ user: safeAdminUser(rows[0]) });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Could not create user: " + (error.message || "Unknown error") });
  }
};

// export const listUsers = async (req, res) => {
//   try {
//     const [rows] = await pool.execute(
//       "SELECT id, name, mobile, address, email, type, email_verified, created_at, updated_at FROM users ORDER BY created_at DESC",
//     );
//     res.json({ users: rows.map(safeAdminUser) });
//   } catch (error) {
//     console.error("List users error:", error);
//     res.status(500).json({ message: "Could not load users" });
//   }
// };

export const listUsers = async (req, res) => {
  try {
    // 1. Get the search term from the URL query parameters
    const search = req.query.search;
    
    // 2. Base query
    let query = "SELECT id, name, mobile, address, email, type, email_verified, created_at, updated_at FROM users";
    let params = [];

    // 3. If a search term exists, add a WHERE clause to filter results
    if (search) {
      query += " WHERE name LIKE ? OR mobile LIKE ? OR email LIKE ?";
      const searchTerm = `%${search}%`; // Add wildcards for partial matching
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 4. Add ordering
    query += " ORDER BY created_at DESC";

    // 5. Execute the query
    const [rows] = await pool.execute(query, params);
    
    res.json({ users: rows.map(safeAdminUser) });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ message: "Could not load users" });
  }
};

export const getTypes = (req, res) => {
  res.json({ types: Array.from(ALLOWED_ROLES) });
};

export const updateUserType = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const type = String(req.body.type || "").trim();
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Valid user id is required" });
    }
    if (!ALLOWED_ROLES.has(type)) {
      return res.status(400).json({ message: "Valid type is required" });
    }

    const [result] = await pool.execute("UPDATE users SET type = ? WHERE id = ?", [type, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [rows] = await pool.execute(
      "SELECT id, name, mobile, address, email, type, email_verified, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
      [id],
    );
    res.json({ user: safeAdminUser(rows[0]) });
  } catch (error) {
    console.error("Update user type error:", error);
    res.status(500).json({ message: "Could not update user type" });
  }
};