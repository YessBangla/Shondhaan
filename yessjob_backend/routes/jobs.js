// routes/jobs.js
const express = require('express');
const mysql = require('mysql2');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const http = require('http');
const https = require('https');
const router = express.Router();
// NEW: burns one job-post credit off an enrolled_packages row and returns
// its visibility_level/expires_at so we can stamp them onto the job.
const { consumeJobSlot } = require('./enrolledPackages');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

const SHONDHAAN_API_URL = process.env.SHONDHAAN_API_URL || 'https://backend-central.shondhaan.com';
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'change-this-secret-in-env';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-should-be-in-env';

// ── Field maps: which incoming body key goes to which table ────────────
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
  'education_required', 'education_subject', 'preferred_institution', 'certifications',
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

const JOB_SELECT_WITH_CATEGORY = `
  SELECT
    jobs.*,
    jc.value AS category,
    jc.label_bn AS category_label_bn,
    jc.label_en AS category_label_en,
    cr.education_required,
    cr.education_subject,
    cr.experience_required,
    cr.experience_min,
    cr.experience_max,
    COALESCE(ep.company_logo_url, jobs.company_logo_url) AS company_logo_url,
    ep.is_verified AS company_is_verified
  FROM jobs
  LEFT JOIN job_categories jc ON jc.id = jobs.category_id
  LEFT JOIN job_candidate_requirements cr ON cr.job_id = jobs.id
  LEFT JOIN employer_profiles ep ON ep.user_id = jobs.user_id
`;

const JOB_SELECT_FULL = `
  SELECT
    jobs.*,
    jc.value AS category,
    jc.label_bn AS category_label_bn,
    jc.label_en AS category_label_en,
    cr.education_required, cr.education_subject, cr.preferred_institution, cr.certifications,
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

// Sort clause shared by the two public/browsable listing routes: jobs whose
// visibility hasn't expired are ranked by package tier (hot first), then
// recency; anything with no active enrollment (or an expired one) falls
// back to plain "basic" ordering by recency alone.
const VISIBILITY_ORDER_BY = `
  ORDER BY
    CASE
      WHEN jobs.visibility_expires_at IS NOT NULL AND jobs.visibility_expires_at > NOW()
      THEN FIELD(jobs.visibility_level, 'hot', 'premium_plus', 'premium', 'standard', 'basic')
      ELSE 5
    END ASC,
    jobs.created_at DESC
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

  const jwtUser = verifyJwtToken(token);
  if (jwtUser) return jwtUser;

  const localUser = verifyLocalAuthToken(token);
  if (localUser) return localUser;

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

async function insertSatelliteRow(conn, table, jobId, data) {
  const columns = ['job_id', ...Object.keys(data)];
  const values = [jobId, ...Object.values(data)];
  const placeholders = columns.map(() => '?').join(', ');
  await conn.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
}

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

  const enrolledPackageId = req.body.enrolled_package_id || null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const userId = req.shondhaanUser.id;

    // If the employer picked a paid/enrolled package for this post, burn
    // one job-post credit from it and inherit its visibility for the
    // enrollment's remaining lifetime. Posting without one (or once quota
    // runs out) just falls back to default 'basic' visibility.
    if (enrolledPackageId) {
      const enrollment = await consumeJobSlot(conn, enrolledPackageId, userId);
      jobData.enrolled_package_id = enrollment.id;
      jobData.package_id = enrollment.package_id;
      jobData.visibility_level = enrollment.visibility_level;
      jobData.visibility_expires_at = enrollment.expires_at;
    }

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
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Server error', detail: err?.message || String(err) });
  }
});

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

router.get('/', async (req, res) => {
  try {
    const {
      category, search, jobType, division, district, thana,
      education, companyType, salaryRange, experienceRange, userId
    } = req.query;

    const conditions = ['jobs.is_closed = 0', "jobs.status = 'approved'"];
    const values = [];

    if (userId) {
      conditions.push('jobs.user_id = ?');
      values.push(userId);
    }
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
      const [min, max] = experienceRange.split('-').map(Number);
      if (!Number.isNaN(min)) { conditions.push('cr.experience_max >= ?'); values.push(min); }
      if (!Number.isNaN(max)) { conditions.push('cr.experience_min <= ?'); values.push(max); }
    }

    const whereClause = conditions.join(' AND ');
    // Public listing: packages with unexpired visibility rank first
    // (hot > premium_plus > premium > standard > basic), newest within
    // each tier. Expired/none-enrolled jobs sort together at the bottom
    // by recency, same as before this feature existed.
    const [rows] = await pool.query(
      `${JOB_SELECT_WITH_CATEGORY} WHERE ${whereClause} ${VISIBILITY_ORDER_BY} LIMIT 100`,
      values
    );
    res.json(rows);
  } catch (err) {
    console.error('List jobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;