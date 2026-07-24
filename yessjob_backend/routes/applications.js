// routes/applications.js
const express = require('express');
const mysql = require('mysql2');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
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
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-should-be-in-env';

// ── Auth ─────────────────────────────────────────────────────────────

// Pulls a role out of whatever shape the user object has. Different token
// issuers / Shondhaan responses have used different field names historically
// (type, role, userType, user_type, account_type, sometimes nested under
// .profile), so this checks all of them instead of just `type`/`role`.
function getUserRole(user = {}) {
  const candidates = [
    user.type,
    user.role,
    user.userType,
    user.user_type,
    user.accountType,
    user.account_type,
    user.profile?.type,
    user.profile?.role,
  ];
  const found = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
  return String(found || '').trim().toLowerCase();
}

function isEmployerRole(role) {
  const normalized = role.replace(/[\s_-]/g, '');
  return normalized === 'employer' || normalized === 'company' || normalized === 'recruiter';
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

/**
 * Try to verify the JWT directly using jsonwebtoken.
 * This is the primary method since the frontend sends a JWT from the central backend.
 */
function verifyJwtToken(token = '') {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) return null;
    return decoded;
  } catch (err) {
    console.log('[auth] Direct JWT verify failed:', err.message);
    return null;
  }
}

async function verifyShondhaanUser(authHeader) {
  if (!authHeader) return null;

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  // 1. Try direct JWT verification
  const jwtUser = verifyJwtToken(token);
  if (jwtUser) return jwtUser;

  // 2. Try local HMAC token
  const localUser = verifyLocalAuthToken(token);
  if (localUser) return localUser;

  // 3. Fallback: forward to central backend
  try {
    const response = await fetch(`${SHONDHAAN_API_URL}/api/users/me/profile`, {
      headers: {
        Authorization: authHeader,
        Cookie: `token=${token}`,
      },
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user && user.id ? user : null;
  } catch (err) {
    console.error('[auth] Fetch to Shondhaan failed:', err.message);
    return null;
  }
}

function requireAuth(req, res, next) {
  verifyShondhaanUser(req.headers.authorization)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: 'Invalid or missing login token' });
      }
      req.shondhaanUser = user;
      next();
    })
    .catch((err) => {
      console.error('Auth check error:', err);
      res.status(500).json({ message: 'Could not verify login' });
    });
}

function requireEmployer(req, res, next) {
  verifyShondhaanUser(req.headers.authorization)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: 'Invalid or missing login token' });
      }
      const role = getUserRole(user);
      console.log('[requireEmployer] user:', JSON.stringify(user), '| resolved role:', JSON.stringify(role));

      if (!isEmployerRole(role)) {
        return res.status(403).json({ message: 'Employer role is required', debugRole: role });
      }
      req.shondhaanUser = user;
      next();
    })
    .catch((err) => {
      console.error('Auth check error:', err);
      res.status(500).json({ message: 'Could not verify login' });
    });
}

// Computes whole-years age from a DATE/DATETIME value returned by mysql2.
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

const APPLICATION_SELECT = `
  SELECT
    ja.*,
    j.title AS job_title,
    j.company_name AS job_company_name,
    j.user_id AS job_owner_id,
    jp.full_name AS jobseeker_name,
    jp.phone AS jobseeker_phone,
    jp.email AS jobseeker_email,
    jp.photo_url AS jobseeker_photo_url
  FROM job_applications ja
  JOIN jobs j ON j.id = ja.job_id
  LEFT JOIN jobseeker_profiles jp ON jp.user_id = ja.jobseeker_id
`;

// ── Apply to a job ── POST /api/jobseeker/applications ──
router.post('/', requireAuth, async (req, res) => {
  try {
    const jobId = Number(req.body.job_id);
    if (!jobId) {
      return res.status(400).json({ message: 'job_id is required' });
    }

    const jobseekerId = req.shondhaanUser.id;

    const [jobRows] = await pool.query(
      `SELECT id, status, is_closed FROM jobs WHERE id = ? LIMIT 1`,
      [jobId]
    );
    if (jobRows.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (jobRows[0].is_closed || jobRows[0].status !== 'approved') {
      return res.status(400).json({ message: 'This job is not open for applications' });
    }

    const [profileRows] = await pool.query(
      `SELECT date_of_birth FROM jobseeker_profiles WHERE user_id = ? LIMIT 1`,
      [jobseekerId]
    );
    if (profileRows.length === 0) {
      return res.status(400).json({ message: 'Complete your jobseeker profile before applying' });
    }
    const ageAtApplication = calculateAge(profileRows[0].date_of_birth);

    const expectedSalary = req.body.expected_salary !== undefined
      ? req.body.expected_salary
      : null;
    const coverLetter = req.body.cover_letter !== undefined
      ? req.body.cover_letter
      : null;

    const [existing] = await pool.query(
      `SELECT id FROM job_applications WHERE job_id = ? AND jobseeker_id = ? LIMIT 1`,
      [jobId, jobseekerId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'You have already applied to this job' });
    }

    const [result] = await pool.query(
      `INSERT INTO job_applications
        (job_id, jobseeker_id, age_at_application, expected_salary, cover_letter)
       VALUES (?, ?, ?, ?, ?)`,
      [jobId, jobseekerId, ageAtApplication, expectedSalary, coverLetter]
    );

    const [rows] = await pool.query(`${APPLICATION_SELECT} WHERE ja.id = ? LIMIT 1`, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create application error:', err);
    res.status(500).json({ message: 'Server error', detail: err?.message || String(err) });
  }
});

// ── Jobseeker: list own applications ── GET /api/jobseeker/applications/mine ──
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${APPLICATION_SELECT} WHERE ja.jobseeker_id = ? ORDER BY ja.created_at DESC`,
      [req.shondhaanUser.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('List my applications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Employer: list applicants for one of their jobs ──
// GET /api/jobseeker/applications/job/:jobId
router.get('/job/:jobId', requireEmployer, async (req, res) => {
  try {
    const jobId = req.params.jobId;

    const [jobRows] = await pool.query(
      `SELECT id FROM jobs WHERE id = ? AND user_id = ? LIMIT 1`,
      [jobId, req.shondhaanUser.id]
    );
    if (jobRows.length === 0) {
      return res.status(404).json({ message: 'Job not found or not owned by you' });
    }

    const [rows] = await pool.query(
      `${APPLICATION_SELECT} WHERE ja.job_id = ? ORDER BY ja.created_at DESC`,
      [jobId]
    );
    res.json(rows);
  } catch (err) {
    console.error('List applicants error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Employer: update an applicant's status ──
// PATCH /api/jobseeker/applications/:id/status   Body: { status }
router.patch('/:id/status', requireEmployer, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = new Set(['pending', 'shortlisted', 'rejected', 'hired']);
    if (!allowed.has(status)) {
      return res.status(400).json({ message: `status must be one of: ${Array.from(allowed).join(', ')}` });
    }

    const [result] = await pool.query(
      `UPDATE job_applications ja
       JOIN jobs j ON j.id = ja.job_id
       SET ja.status = ?
       WHERE ja.id = ? AND j.user_id = ?`,
      [status, req.params.id, req.shondhaanUser.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Application not found or not owned by you' });
    }

    const [rows] = await pool.query(`${APPLICATION_SELECT} WHERE ja.id = ? LIMIT 1`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update application status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Jobseeker: withdraw an application ── DELETE /api/jobseeker/applications/:id ──
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM job_applications WHERE id = ? AND jobseeker_id = ?`,
      [req.params.id, req.shondhaanUser.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Application not found or not owned by you' });
    }
    res.json({ message: 'Application withdrawn', id: req.params.id });
  } catch (err) {
    console.error('Withdraw application error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ── Employer: list applications across every job they own ──
// GET /api/jobseeker/applications/employer/mine
// Ownership is enforced in the JOIN itself (j.user_id = req.shondhaanUser.id) —
// an employer can only ever see applications for jobs they actually posted.
router.get('/employer/mine', requireEmployer, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${APPLICATION_SELECT} WHERE j.user_id = ? ORDER BY ja.created_at DESC`,
      [req.shondhaanUser.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('List employer applications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}); 
module.exports = router;