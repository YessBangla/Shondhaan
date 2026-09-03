import { randomUUID } from "crypto";
import { pool } from "../config/db.js";

const formatContactMessage = (message) => ({
  ...message,
  id: String(message.id),
});

export const getContactMessages = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, phone, message, created_at FROM contact_messages ORDER BY created_at DESC"
    );

    return res.json({ data: rows.map(formatContactMessage) });
  } catch (error) {
    console.error("Get contact messages error:", error);
    return res.status(500).json({
      message: "Failed to fetch contact messages",
      error: error.message,
    });
  }
};

export const createContactMessage = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim();
    const cleanMessage = String(message || "").trim();
    const cleanPhone = String(phone || "").trim() || null;

    if (!cleanName || !cleanEmail || !cleanMessage) {
      return res.status(400).json({ message: "Name, email, and message are required" });
    }

    if (cleanName.length > 100 || cleanEmail.length > 255 || cleanPhone?.length > 20 || cleanMessage.length > 2000) {
      return res.status(400).json({ message: "Contact message fields are too long" });
    }

    const id = randomUUID();
    await pool.execute(
      "INSERT INTO contact_messages (id, name, email, phone, message) VALUES (?, ?, ?, ?, ?)",
      [id, cleanName, cleanEmail, cleanPhone, cleanMessage]
    );

    const [rows] = await pool.execute(
      "SELECT id, name, email, phone, message, created_at FROM contact_messages WHERE id = ? LIMIT 1",
      [id]
    );

    return res.status(201).json({
      message: "Contact message submitted successfully",
      data: formatContactMessage(rows[0]),
    });
  } catch (error) {
    console.error("Create contact message error:", error);
    return res.status(500).json({
      message: "Failed to submit contact message",
      error: error.message,
    });
  }
};