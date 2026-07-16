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

// ── Field maps: which incoming body key goes to which table ────────────
// Keeping these as separate lists (rather than one big WRITABLE_FIELDS)
// is what makes the four-table split possible: pickFields() below slices
// req.body into four buckets, one per table, based on these lists.

const JOB_FIELDS = [ // -> jobs (Step 1: Job Information)
  'title', 'company_name', 'company_logo_url', 'description', 'requirements',
  'benefits', 'application_instruction', 'job_type', 'company_type',
  'salary_min', 'salary_max', 'salary_negotiable', 'salary_hidden',
  'work_from_office', 'work_from_home',
  'division', 'district', 'thana', 'address',
  'vacancy_count', 'deadline', 'contact_phone', 'contact_email'
];
const JOB_BOOLEAN_FIELDS = ['salary_negotiable', 'salary_hidden', 'work_from_office', 'work_from_home'];

const CANDIDATE_REQ_FIELDS = [ // -> job_candidate_requirements (Step 2 + Step 3's age/gender restrict)
  'education_required', 'preferred_institution', 'certifications',
  'gender_preference', 'gender_restrict',
  'age_min', 'age_max', 'age_restrict',
  'experience_required', 'experience_min', 'experience_max',
  'prefer_video_resume', 'additional_requirements'
];
const CANDIDATE_REQ_BOOLEAN_FIELDS = ['gender_restrict', 'age_restrict', 'experience_required', 'prefer_video_resume'];

const MATCHING_FIELDS = ['industry_experience', 'skills']; // -> job_matching_criteria (rest of Step 3)

const BILLING_FIELDS = [ // -> job_billing_contacts (Step 4)
  'billing_contact_name', 'billing_designation', 'billing_email', 'billing_mobile',
  'hr_contact_name', 'hr_designation', 'hr_email', 'hr_mobile'
];

// 'category' is deliberately not in JOB_FIELDS — the incoming request sends
// the category's display `value` (e.g. "it"), but what's stored is
// jobs.category_id, an INT. It's resolved separately via resolveCategoryId().

function pickFields(body, fieldList, booleanFields = []) {
  const out = {};
  for (const key of fieldList) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  for (const key of booleanFields) {
    if (key in out) out[key] = out[key] ? 1 : 0;
  }
  return out;
}

function getUserRole(user = {}) {
  return String(user.type || user.role || '').trim().toLowerCase();
}

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

// Resolves whatever the client sent for "category" into a job_categories.id.
async function resolveCategoryId(categoryInput) {
  if (categoryInput === undefined || categoryInput === null || categoryInput === '') return null;

  const asNumber = Number(categoryInput);
  const isNumericId = Number.isInteger(asNumber) && String(asNumber) === String(categoryInput).trim();

  const [rows] = await pool.query(
    isNumericId
      ? 'SELECT id FROM job_categories WHERE id = ? AND is_active = 1 LIMIT 1'
      : 'SELECT id FROM job_categories WHERE value = ? AND is_active = 1 LIMIT 1',
    [isNumericId ? asNumber : categoryInput]
  );

  return rows.length > 0 ? rows[0].id : null;
}

// Lightweight SELECT for listing pages (jobs + category only — no need to
// drag in candidate/matching/billing data for a list view).
const JOB_SELECT_WITH_CATEGORY = `
  SELECT
    jobs.*,
    jc.value AS category,
    jc.label_bn AS category_label_bn,
    jc.label_en AS category_label_en
  FROM jobs
  LEFT JOIN job_categories jc ON jc.id = jobs.category_id
`;

// Full SELECT for single-job views (create/update/detail responses) —
// joins in all three satellite tables so the client gets one flat object
// back, same shape as before the table split.
const JOB_SELECT_FULL = `
  SELECT
    jobs.*,
    jc.value AS category,
    jc.label_bn AS category_label_bn,
    jc.label_en AS category_label_en,
    cr.education_required, cr.preferred_institution, cr.certifications,
    cr.gender_preference, cr.gender_restrict,
    cr.age_min, cr.age_max, cr.age_restrict,
    cr.experience_required, cr.experience_min, cr.experience_max,
    cr.prefer_video_resume, cr.additional_requirements,
    mc.industry_experience, mc.skills,
    bc.billing_contact_name, bc.billing_designation, bc.billing_email, bc.billing_mobile,
    bc.hr_contact_name, bc.hr_designation, bc.hr_email, bc.hr_mobile
  FROM jobs
  LEFT JOIN job_categories jc ON jc.id = jobs.category_id
  LEFT JOIN job_candidate_requirements cr ON cr.job_id = jobs.id
  LEFT JOIN job_matching_criteria mc ON mc.job_id = jobs.id
  LEFT JOIN job_billing_contacts bc ON bc.job_id = jobs.id
`;

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

// Admin/super_admin only.
function requireAdmin(req, res, next) {
  verifyShondhaanUser(req.headers.authorization)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: 'Invalid or missing login token' });
      }
      if (!ADMIN_ROLES.has(getUserRole(user))) {
        return res.status(403).json({ message: 'Admin access is required' });
      }
      req.shondhaanUser = user;
      next();
    })
    .catch((err) => {
      console.error('Admin auth check error:', err);
      res.status(500).json({ message: 'Could not verify login' });
    });
}

// Inserts one row into a satellite table for a freshly-created job. Always
// inserts (even if `data` is empty) so every job has exactly one row in
// each of the three satellite tables — that's what makes the later
// "INSERT ... ON DUPLICATE KEY UPDATE" upsert in PATCH /:id work.
async function insertSatelliteRow(conn, table, jobId, data) {
  const columns = ['job_id', ...Object.keys(data)];
  const values = [jobId, ...Object.values(data)];
  const placeholders = columns.map(() => '?').join(', ');
  await conn.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
}

// Upserts one row into a satellite table on job update. No-ops if `data`
// is empty (client didn't send any fields for that section).
async function upsertSatelliteRow(conn, table, jobId, data) {
  const keys = Object.keys(data);
  if (keys.length === 0) return;
  const columns = ['job_id', ...keys];
  const values = [jobId, ...Object.values(data)];
  const placeholders = columns.map(() => '?').join(', ');
  const updateClause = keys.map((k) => `${k} = VALUES(${k})`).join(', ');
  await conn.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updateClause}`,
    values
  );
}

// Create a job posting (employer only).
// Writes to all four tables in a single transaction: jobs, then
// job_candidate_requirements / job_matching_criteria / job_billing_contacts,
// all keyed on the new job's id. If any insert fails, everything rolls back
// — you never end up with a jobs row that has no matching satellite rows.
//
// New jobs are always "pending" — they only become publicly visible on
// JobHome (which filters jobs.status = 'approved') once an admin approves
// them. Do not default this to 'approved' here even temporarily.
router.post('/', requireEmployer, async (req, res) => {
  const jobData = pickFields(req.body, JOB_FIELDS, JOB_BOOLEAN_FIELDS);
  if (!jobData.title || !jobData.company_name || !jobData.description) {
    return res.status(400).json({ message: 'title, company_name and description are required' });
  }

  const categoryInput = req.body.category !== undefined ? req.body.category : 'general';
  const categoryId = await resolveCategoryId(categoryInput);
  if (categoryId === null) {
    return res.status(400).json({ message: `Unknown category "${categoryInput}"` });
  }
  jobData.category_id = categoryId;
  jobData.status = 'pending';

  const candidateReqData = pickFields(req.body, CANDIDATE_REQ_FIELDS, CANDIDATE_REQ_BOOLEAN_FIELDS);
  const matchingData = pickFields(req.body, MATCHING_FIELDS);
  const billingData = pickFields(req.body, BILLING_FIELDS);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const userId = req.shondhaanUser.id;
    const jobColumns = ['user_id', ...Object.keys(jobData)];
    const jobValues = [userId, ...Object.values(jobData)];
    const [jobResult] = await conn.query(
      `INSERT INTO jobs (${jobColumns.join(', ')}) VALUES (${jobColumns.map(() => '?').join(', ')})`,
      jobValues
    );
    const jobId = jobResult.insertId;

    await insertSatelliteRow(conn, 'job_candidate_requirements', jobId, candidateReqData);
    await insertSatelliteRow(conn, 'job_matching_criteria', jobId, matchingData);
    await insertSatelliteRow(conn, 'job_billing_contacts', jobId, billingData);

    await conn.commit();
    conn.release();

    const [rows] = await pool.query(`${JOB_SELECT_FULL} WHERE jobs.id = ? LIMIT 1`, [jobId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Create job error:', err);
    res.status(500).json({ message: 'Server error', detail: err?.message || String(err) });
  }
});

// List jobs posted by the logged-in employer
router.get('/mine', requireEmployer, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${JOB_SELECT_WITH_CATEGORY} WHERE jobs.user_id = ? ORDER BY jobs.created_at DESC`,
      [req.shondhaanUser.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('List my jobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────
// Registered before "/:id" so "admin" isn't swallowed as an id param.

router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    const conditions = [];
    const values = [];

    if (status && status !== 'all') {
      conditions.push('jobs.status = ?');
      values.push(status);
    }
    if (search) {
      conditions.push('(jobs.title LIKE ? OR jobs.company_name LIKE ?)');
      const like = `%${search}%`;
      values.push(like, like);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `${JOB_SELECT_WITH_CATEGORY} ${whereClause} ORDER BY jobs.created_at DESC`,
      values
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin list jobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = new Set(['pending', 'approved', 'rejected', 'closed']);
    if (!allowed.has(status)) {
      return res.status(400).json({ message: `status must be one of: ${Array.from(allowed).join(', ')}` });
    }

    const [result] = await pool.query('UPDATE jobs SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const [rows] = await pool.query(`${JOB_SELECT_FULL} WHERE jobs.id = ? LIMIT 1`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Admin update job status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/featured', requireAdmin, async (req, res) => {
  try {
    const featured = req.body.featured ? 1 : 0;
    const [result] = await pool.query('UPDATE jobs SET is_featured = ? WHERE id = ?', [featured, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const [rows] = await pool.query(`${JOB_SELECT_FULL} WHERE jobs.id = ? LIMIT 1`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Admin toggle featured error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single job (public) — full data across all four tables
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`${JOB_SELECT_FULL} WHERE jobs.id = ? LIMIT 1`, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a job (only the owning employer).
// Updates jobs directly, and upserts each satellite table — only touching
// a satellite table if the client actually sent fields belonging to it.
router.patch('/:id', requireEmployer, async (req, res) => {
  const jobId = req.params.id;
  const userId = req.shondhaanUser.id;

  const [existing] = await pool.query(
    'SELECT id FROM jobs WHERE id = ? AND user_id = ? LIMIT 1',
    [jobId, userId]
  );
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Job not found or not owned by you' });
  }

  const jobData = pickFields(req.body, JOB_FIELDS, JOB_BOOLEAN_FIELDS);

  if (req.body.category !== undefined) {
    const categoryId = await resolveCategoryId(req.body.category);
    if (categoryId === null) {
      return res.status(400).json({ message: `Unknown category "${req.body.category}"` });
    }
    jobData.category_id = categoryId;
  }

  const candidateReqData = pickFields(req.body, CANDIDATE_REQ_FIELDS, CANDIDATE_REQ_BOOLEAN_FIELDS);
  const matchingData = pickFields(req.body, MATCHING_FIELDS);
  const billingData = pickFields(req.body, BILLING_FIELDS);

  const nothingToUpdate =
    Object.keys(jobData).length === 0 &&
    Object.keys(candidateReqData).length === 0 &&
    Object.keys(matchingData).length === 0 &&
    Object.keys(billingData).length === 0;
  if (nothingToUpdate) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (Object.keys(jobData).length > 0) {
      const setClause = Object.keys(jobData).map((k) => `${k} = ?`).join(', ');
      await conn.query(
        `UPDATE jobs SET ${setClause} WHERE id = ? AND user_id = ?`,
        [...Object.values(jobData), jobId, userId]
      );
    }

    await upsertSatelliteRow(conn, 'job_candidate_requirements', jobId, candidateReqData);
    await upsertSatelliteRow(conn, 'job_matching_criteria', jobId, matchingData);
    await upsertSatelliteRow(conn, 'job_billing_contacts', jobId, billingData);

    await conn.commit();
    conn.release();

    const [rows] = await pool.query(`${JOB_SELECT_FULL} WHERE jobs.id = ? LIMIT 1`, [jobId]);
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Update job error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Delete a job (only the owning employer).
// Removes the job's rows from all three satellite tables plus the jobs
// row itself, in one transaction. If your DB has ON DELETE CASCADE set up
// on the job_id foreign keys, the satellite deletes are redundant but
// harmless; if not, they're required or the FK constraint will block
// deleting the jobs row.
router.delete('/:id', requireEmployer, async (req, res) => {
  const jobId = req.params.id;
  const userId = req.shondhaanUser.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT id FROM jobs WHERE id = ? AND user_id = ? LIMIT 1',
      [jobId, userId]
    );
    if (existing.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: 'Job not found or not owned by you' });
    }

    await conn.query('DELETE FROM job_candidate_requirements WHERE job_id = ?', [jobId]);
    await conn.query('DELETE FROM job_matching_criteria WHERE job_id = ?', [jobId]);
    await conn.query('DELETE FROM job_billing_contacts WHERE job_id = ?', [jobId]);
    await conn.query('DELETE FROM jobs WHERE id = ? AND user_id = ?', [jobId, userId]);

    await conn.commit();
    conn.release();
    res.json({ message: 'Job deleted', id: jobId });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Delete job error:', err);
    res.status(500).json({ message: 'Server error', detail: err?.message || String(err) });
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

    const [rows] = await pool.query(`${JOB_SELECT_FULL} WHERE jobs.id = ? LIMIT 1`, [jobId]);
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

    const [rows] = await pool.query(`${JOB_SELECT_FULL} WHERE jobs.id = ? LIMIT 1`, [jobId]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Reopen job error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: list open jobs (for job seekers browsing)
// No approval gate beyond status='approved'. Lightweight join (category
// only) since listing cards don't need candidate/billing details.
router.get('/', async (req, res) => {
  try {
    const {
      category, search, jobType, division, district, thana,
      education, companyType, salaryRange, experienceRange
    } = req.query;

    const conditions = ['jobs.is_closed = 0', "jobs.status = 'approved'"];
    const values = [];
    let joinCandidateReq = false;

    if (category && category !== 'all') {
      conditions.push('jc.value = ?');
      values.push(category);
    }
    if (jobType && jobType !== 'all') {
      conditions.push('jobs.job_type = ?');
      values.push(jobType);
    }
    if (division) {
      conditions.push('jobs.division = ?');
      values.push(division);
    }
    if (district) {
      conditions.push('jobs.district = ?');
      values.push(district);
    }
    if (thana) {
      conditions.push('jobs.thana = ?');
      values.push(thana);
    }
    if (education && education !== 'any') {
      joinCandidateReq = true;
      conditions.push('cr.education_required = ?');
      values.push(education);
    }
    if (companyType && companyType !== 'all') {
      conditions.push('jobs.company_type = ?');
      values.push(companyType);
    }
    if (search) {
      conditions.push('(jobs.title LIKE ? OR jobs.company_name LIKE ? OR jobs.description LIKE ?)');
      const like = `%${search}%`;
      values.push(like, like, like);
    }
    if (salaryRange) {
      const [min, max] = salaryRange.split('-').map(Number);
      if (!Number.isNaN(min)) { conditions.push('jobs.salary_max >= ?'); values.push(min); }
      if (!Number.isNaN(max)) { conditions.push('jobs.salary_min <= ?'); values.push(max); }
    }
    if (experienceRange) {
      joinCandidateReq = true;
      const [min, max] = experienceRange.split('-').map(Number);
      if (!Number.isNaN(min)) { conditions.push('cr.experience_max >= ?'); values.push(min); }
      if (!Number.isNaN(max)) { conditions.push('cr.experience_min <= ?'); values.push(max); }
    }

    // education/experience filters live in job_candidate_requirements now,
    // so only pull in that join when one of those filters is actually used.
    const baseSelect = joinCandidateReq
      ? `${JOB_SELECT_WITH_CATEGORY} LEFT JOIN job_candidate_requirements cr ON cr.job_id = jobs.id`
      : JOB_SELECT_WITH_CATEGORY;

    const whereClause = conditions.join(' AND ');
    const [rows] = await pool.query(
      `${baseSelect} WHERE ${whereClause} ORDER BY jobs.created_at DESC LIMIT 100`,
      values
    );
    res.json(rows);
  } catch (err) {
    console.error('List jobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;