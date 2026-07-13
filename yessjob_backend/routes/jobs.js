// routes/jobs.js
const express = require('express');
const mysql = require('mysql2');
const crypto = require('crypto');
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

const SHONDHAAN_API_URL = process.env.SHONDHAAN_API_URL || 'http://localhost:5000';
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'change-this-secret-in-env';

const WRITABLE_FIELDS = [
  'title', 'company_name', 'company_logo_url', 'description', 'requirements',
  'benefits', 'application_instruction', 'job_type', 'category', 'company_type',
  'education_required', 'gender_preference', 'age_min', 'age_max',
  'experience_min', 'experience_max', 'salary_min', 'salary_max',
  'salary_negotiable', 'division', 'district', 'thana', 'address',
  'vacancy_count', 'deadline', 'contact_phone', 'contact_email'
];

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  if ('salary_negotiable' in out) out.salary_negotiable = out.salary_negotiable ? 1 : 0;
  return out;
}

function getUserRole(user = {}) {
  return String(user.type || user.role || '').trim().toLowerCase();
}

function verifyLocalAuthToken(token = '') {
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature) return null;

  const expected = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.id || !data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

async function verifyShondhaanUser(authHeader) {
  if (!authHeader) return null;

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const localUser = verifyLocalAuthToken(token);
  if (localUser) return localUser;

  try {
    const response = await fetch(`${SHONDHAAN_API_URL}/api/users/me/profile`, {
      headers: { Authorization: authHeader },
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user && user.id ? user : null;
  } catch (err) {
    console.error('[auth] Fetch to Shondhaan failed:', err.message);
    return null;
  }
}

function requireEmployer(req, res, next) {
  verifyShondhaanUser(req.headers.authorization)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: 'Invalid or missing login token' });
      }
      if (getUserRole(user) !== 'employer') {
        return res.status(403).json({ message: 'Employer role is required' });
      }
      req.shondhaanUser = user;
      next();
    })
    .catch((err) => {
      console.error('Auth check error:', err);
      res.status(500).json({ message: 'Could not verify login' });
    });
}

// Create a job posting (employer only)
router.post('/', requireEmployer, async (req, res) => {
  try {
    const data = pickWritable(req.body);
    if (!data.title || !data.company_name || !data.description) {
      return res.status(400).json({ message: 'title, company_name and description are required' });
    }

    const userId = req.shondhaanUser.id;
    const columns = ['user_id', ...Object.keys(data)];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [userId, ...Object.values(data)];

    const [result] = await pool.query(
      `INSERT INTO jobs (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ? LIMIT 1', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// List jobs posted by the logged-in employer
router.get('/mine', requireEmployer, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC',
      [req.shondhaanUser.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('List my jobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single job (public)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ? LIMIT 1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a job (only the owning employer)
router.patch('/:id', requireEmployer, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.shondhaanUser.id;

    const [existing] = await pool.query(
      'SELECT id FROM jobs WHERE id = ? AND user_id = ? LIMIT 1',
      [jobId, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Job not found or not owned by you' });
    }

    const data = pickWritable(req.body);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), jobId, userId];
    await pool.query(
      `UPDATE jobs SET ${setClause} WHERE id = ? AND user_id = ?`,
      values
    );

    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ? LIMIT 1', [jobId]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Close a job (only the owning employer)
router.patch('/:id/close', requireEmployer, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.shondhaanUser.id;
    const reason = req.body.reason || null;

    const [result] = await pool.query(
      `UPDATE jobs
       SET is_closed = 1, closed_at = NOW(), closure_reason = ?, status = 'closed'
       WHERE id = ? AND user_id = ?`,
      [reason, jobId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job not found or not owned by you' });
    }

    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ? LIMIT 1', [jobId]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Close job error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reopen a job (only the owning employer)
router.patch('/:id/reopen', requireEmployer, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.shondhaanUser.id;

    const [result] = await pool.query(
      `UPDATE jobs
       SET is_closed = 0, closed_at = NULL, closure_reason = NULL, status = 'approved'
       WHERE id = ? AND user_id = ?`,
      [jobId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job not found or not owned by you' });
    }

    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ? LIMIT 1', [jobId]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Reopen job error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: list approved, open jobs (for job seekers browsing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM jobs WHERE status = 'approved' AND is_closed = 0 ORDER BY created_at DESC LIMIT 100"
    );
    res.json(rows);
  } catch (err) {
    console.error('List jobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;