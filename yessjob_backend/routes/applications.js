// routes/applications.js
const express = require('express');
const mysql = require('mysql2');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const http = require('http');
const https = require('https');
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

// This service is deployed separately from the central-auth backend. Never
// default to localhost here: on backend-yjob that points at the YessJob
// process itself, so every forwarded login check fails in production.
const SHONDHAAN_API_URL = process.env.SHONDHAAN_API_URL;
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

// Node 18+ exposes fetch globally, but some production Node deployments do
// not. Authentication must not turn into a 500 simply because that global is
// unavailable, so use the native HTTP client as a compatible fallback.
function getCentralProfile(url, authHeader, token) {
  if (typeof fetch === 'function') {
    return fetch(url, {
      headers: { Authorization: authHeader, Cookie: `token=${token}` },
    }).then(async (response) => {
      if (!response.ok) return null;
      return response.json();
    });
  }

  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const request = client.request(target, {
      method: 'GET',
      headers: { Authorization: authHeader, Cookie: `token=${token}` },
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) return resolve(null);
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.end();
  });
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
    const user = await getCentralProfile(
      `${SHONDHAAN_API_URL}/api/users/me/profile`,
      authHeader,
      token
    );
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

// ── Employer: update an applicant's pipeline stage / score / notes ──
// PATCH /api/jobseeker/applications/:id/stage
// Body (all optional, send only what you're changing):
//   { hiring_stage?, score?, interviewer_notes?, attendance? }
//
// This is what EmployerPanel.tsx actually calls for shortlist/reject/score/
// comment actions in the applications and hiring-pipeline tabs. Ownership is
// enforced the same way as the /status route above: the UPDATE only touches
// rows where the joined job belongs to this employer.
router.patch('/:id/stage', requireEmployer, async (req, res) => {
  try {
    const { hiring_stage, score, interviewer_notes, attendance } = req.body;

    const allowedStages = new Set([
      'applied', 'shortlisted', 'interview_scheduled',
      'interviewed', 'scored', 'hired', 'rejected'
    ]);
    if (hiring_stage !== undefined && !allowedStages.has(hiring_stage)) {
      return res.status(400).json({ message: `hiring_stage must be one of: ${Array.from(allowedStages).join(', ')}` });
    }

    if (score !== undefined && score !== null) {
      const n = Number(score);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return res.status(400).json({ message: 'score must be a number between 0 and 100' });
      }
    }

    const allowedAttendance = new Set(['present', 'absent', 'no_show']);
    if (attendance !== undefined && attendance !== null && !allowedAttendance.has(attendance)) {
      return res.status(400).json({ message: `attendance must be one of: ${Array.from(allowedAttendance).join(', ')}` });
    }

    // Build the SET clause dynamically from whichever fields were sent.
    const sets = [];
    const values = [];
    if (hiring_stage !== undefined) { sets.push('ja.hiring_stage = ?'); values.push(hiring_stage); }
    if (score !== undefined) { sets.push('ja.score = ?'); values.push(score); }
    if (interviewer_notes !== undefined) { sets.push('ja.interviewer_notes = ?'); values.push(interviewer_notes); }
    if (attendance !== undefined) { sets.push('ja.attendance = ?'); values.push(attendance); }

    if (sets.length === 0) {
      return res.status(400).json({ message: 'Provide at least one of: hiring_stage, score, interviewer_notes, attendance' });
    }

    values.push(req.params.id, req.shondhaanUser.id);

    const [result] = await pool.query(
      `UPDATE job_applications ja
       JOIN jobs j ON j.id = ja.job_id
       SET ${sets.join(', ')}
       WHERE ja.id = ? AND j.user_id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Application not found or not owned by you' });
    }

    const [rows] = await pool.query(`${APPLICATION_SELECT} WHERE ja.id = ? LIMIT 1`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update application stage error:', err);
    res.status(500).json({ message: 'Server error', detail: err?.message || String(err) });
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
// ── Jobseeker: withdraw an application (soft — status only, row stays) ──
// PATCH /api/jobseeker/applications/:id/withdraw
router.patch('/:id/withdraw', requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT ja.id, ja.status, ja.jobseeker_id, j.user_id AS employer_id, j.title AS job_title
       FROM job_applications ja
       JOIN jobs j ON j.id = ja.job_id
       WHERE ja.id = ? AND ja.jobseeker_id = ?
       LIMIT 1`,
      [req.params.id, req.shondhaanUser.id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Application not found or not owned by you' });
    }
    const application = rows[0];
    if (['hired', 'rejected', 'withdrawn'].includes(application.status)) {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot withdraw an application that is already ${application.status}` });
    }

    await conn.query(
      `UPDATE job_applications SET status = 'withdrawn' WHERE id = ?`,
      [req.params.id]
    );

    const [interviewRows] = await conn.query(
      `SELECT id FROM interviews WHERE application_id = ? AND status = 'scheduled'`,
      [req.params.id]
    );
    if (interviewRows.length > 0) {
      await conn.query(
        `UPDATE interviews SET status = 'declined' WHERE application_id = ? AND status = 'scheduled'`,
        [req.params.id]
      );
    }

    // Let the employer know — mirrors the interview-decline notification in
    // routes/interviews.js so both paths show up the same way in their inbox.
    await conn.query(
      `INSERT INTO notifications (recipient_id, type, title, message, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        application.employer_id,
        'application_withdrawn',
        'একজন প্রার্থী আবেদন প্রত্যাহার করেছেন',
        `"${application.job_title}" পদের জন্য একজন প্রার্থী তার আবেদন প্রত্যাহার করেছেন।${interviewRows.length > 0 ? ' সংশ্লিষ্ট ইন্টারভিউটিও বাতিল হয়েছে।' : ''}`,
        application.id,
      ]
    );

    await conn.commit();

    const [full] = await pool.query(`${APPLICATION_SELECT} WHERE ja.id = ? LIMIT 1`, [req.params.id]);
    res.json(full[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Withdraw application error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});
module.exports = router;