// routes/notifications.js
//
// Mount in your server startup file after createNotificationsTable() has run:
//
//   const notificationsRouter = require('./routes/notifications');
//   app.use('/api/notifications', notificationsRouter);
//
// Same auth pattern as routes/applications.js and routes/interviews.js:
// verifyShondhaanUser sets req.shondhaanUser.id, and every query is scoped
// to recipient_id = req.shondhaanUser.id — this works whether the caller
// is an employer or a jobseeker, since notifications.recipient_id can hold
// either kind of Shondhaan user id.

const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// Same inline auth check as routes/interviews.js — see the comment there
// for the decoded.id assumption.
router.use((req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'অনুমোদন প্রয়োজন' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.shondhaanUser = { id: decoded.id }; // <-- adjust decoded.id if your payload differs
    next();
  } catch (err) {
    return res.status(401).json({ message: 'অবৈধ বা মেয়াদোত্তীর্ণ টোকেন' });
  }
});

// GET /api/notifications/mine?unread_only=true
router.get('/mine', async (req, res) => {
  const unreadOnly = req.query.unread_only === 'true';
  try {
    const [rows] = await pool.query(
      `SELECT * FROM notifications
       WHERE recipient_id = ? ${unreadOnly ? 'AND is_read = 0' : ''}
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.shondhaanUser.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ message: 'নোটিফিকেশন লোড করতে সমস্যা হয়েছে' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = ? AND is_read = 0`,
      [req.shondhaanUser.id]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error('Failed to fetch unread count:', err);
    res.status(500).json({ message: 'সমস্যা হয়েছে' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?`,
      [req.params.id, req.shondhaanUser.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'পাওয়া যায়নি' });
    }
    res.status(204).end();
  } catch (err) {
    console.error('Failed to mark notification read:', err);
    res.status(500).json({ message: 'সমস্যা হয়েছে' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE recipient_id = ?`,
      [req.shondhaanUser.id]
    );
    res.status(204).end();
  } catch (err) {
    console.error('Failed to mark all read:', err);
    res.status(500).json({ message: 'সমস্যা হয়েছে' });
  }
});

module.exports = router;