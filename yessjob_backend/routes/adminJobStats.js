// routes/adminJobStats.js
//
// Feeds the সন্ধান জব tab in the admin analytics dashboard, which lives
// in a separate frontend/service and calls this jobs backend directly
// (BACKEND_URL — http://localhost:5050 in dev,
// https://backend-yjob.shondhaan.com in production).
//
// package income = SUM(amount) over payment_transactions WHERE status = 'success'
// (all statuses are returned, not just success, so the frontend can also
// show a pending/success/failed/cancelled breakdown — same pattern as the
// booking/request status pies already in the dashboard).
//
// package_name is joined in from `packages` at read time. Since packages
// is CMS-editable, transaction `amount` is a snapshot of the price paid
// at purchase time and will NOT match the package's current price if it
// was changed later — that's expected, not a bug. LEFT JOIN (not INNER)
// so transactions for a since-deleted package still show up, just with
// package_name: null.
const express = require('express');
const mysql = require('mysql2');
const { requireAdmin } = require('../utils/auth');
const router = express.Router();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// GET /api/admin/job-stats
//
// Response shape:
// {
//   packageTransactions: [{ id, package_id, amount, status, created_at, employer_user_id, package_name }],
//   jobseekerProfiles:   [{ id, created_at }],
//   employerProfiles:    [{ id, created_at }]
// }
// `requireAdmin` (from utils/auth.js) verifies the central/admin JWT (with
// fallbacks) and enforces the admin role, so this endpoint works with the
// same Authorization header the rest of the admin UI uses.
router.get('/job-stats', requireAdmin, async (req, res) => {
  try {
    const [packageTransactions] = await pool.query(
      `SELECT pt.id, pt.package_id, pt.amount, pt.status, pt.created_at,
              pt.employer_user_id, p.name AS package_name
       FROM payment_transactions pt
       LEFT JOIN packages p ON p.id = pt.package_id
       ORDER BY pt.created_at DESC`
    );

    // Assumes created_at exists on both tables, matching the rest of this
    // schema. If either table doesn't have it, drop it from the SELECT —
    // the frontend falls back to a total-count-only card for that series.
    const [jobseekerProfiles] = await pool.query(
      `SELECT id, created_at FROM jobseeker_profiles ORDER BY created_at DESC`
    );

    const [employerProfiles] = await pool.query(
      `SELECT id, created_at FROM employer_profiles ORDER BY created_at DESC`
    );

    res.json({ packageTransactions, jobseekerProfiles, employerProfiles });
  } catch (err) {
    console.error('GET /api/admin/job-stats failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;