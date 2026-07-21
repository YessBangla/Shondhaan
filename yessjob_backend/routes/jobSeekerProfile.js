// routes/jobSeekerProfile.js
//
// ⚠️  SECURITY WARNING — TEMPORARY, INSECURE AUTH  ⚠️
// This route no longer verifies who the caller is. It trusts whatever
// user_id the client sends (as a ?user_id= query param, or a user_id
// field in the JSON body for PUT). ANY client can read, overwrite, or
// delete ANY other user's jobseeker profile just by changing that id.
// This unblocks local development only — before this goes anywhere near
// production, put real auth back (JWT verification, session lookup,
// anything the client can't spoof).
//
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
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

// ── Fields the client can write ─────────────────────────────────────
const PROFILE_FIELDS = [
  'full_name', 'phone', 'email', 'address', 'date_of_birth', 'gender', 'marital_status',
  'about_me', 'career_objective', 'present_salary', 'expected_salary',
  'is_available'
];
const PROFILE_BOOLEAN_FIELDS = ['is_available'];

// Stored as JSON columns — stringified before insert, parsed back on read.
const JSON_FIELDS = [
  'skills', 'education', 'experience', 'training',
  'languages', 'reference_persons', 'preferred_job_categories', 'preferred_districts'
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

function pickJsonFields(body) {
  const out = {};
  for (const key of JSON_FIELDS) {
    if (body[key] !== undefined) out[key] = JSON.stringify(body[key] ?? []);
  }
  return out;
}

function parseProfileRow(row) {
  if (!row) return null;
  const parsed = { ...row };
  for (const field of JSON_FIELDS) {
    if (parsed[field] && typeof parsed[field] === 'string') {
      try { parsed[field] = JSON.parse(parsed[field]); } catch { parsed[field] = []; }
    } else if (!parsed[field]) {
      parsed[field] = [];
    }
  }
  parsed.is_available = !!parsed.is_available;
  return parsed;
}

function calculateCompleteness(p) {
  let score = 0;
  if (p.full_name) score += 10;
  if (p.phone) score += 8;
  if (p.email) score += 5;
  if (p.photo_url) score += 10;
  if (p.about_me) score += 8;
  if (p.career_objective) score += 8;
  if (p.skills?.length) score += 12;
  if (p.education?.length) score += 12;
  if (p.experience?.length) score += 12;
  if (p.address) score += 5;
  if (p.reference_persons?.length) score += 5;
  if (p.languages?.length) score += 5;
  return Math.min(score, 100);
}

// ── "Auth" — trusts a client-supplied user_id, no verification ──────
// Reads from the query string first (works for multipart uploads too,
// since it's available before multer parses the body), falling back
// to a JSON body field for plain PUT requests.
function requireUserId(req, res, next) {
  const rawId = req.query.user_id ?? req.body?.user_id;
  const userId = Number(rawId);

  if (!rawId || Number.isNaN(userId)) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  req.shondhaanUser = { id: userId };
  next();
}

// ── Upload storage setup ─────────────────────────────────────────────
const PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'jobseeker', 'photos');
const VIDEO_DIR = path.join(__dirname, '..', 'uploads', 'jobseeker', 'videos');
fs.mkdirSync(PHOTO_DIR, { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PHOTO_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `user_${req.shondhaanUser.id}_photo${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, VIDEO_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.webm';
      cb(null, `user_${req.shondhaanUser.id}_video${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // FIX: browsers recording via MediaRecorder send a mimetype like
    // "video/webm;codecs=vp9,opus", not the bare "video/webm" this used
    // to check for with an exact match. That mismatch made every
    // browser-recorded video CV get rejected here, and because multer
    // errors thrown in fileFilter bypass this route's own try/catch,
    // Express's default HTML error page was returned instead of JSON —
    // which is what caused the "Unexpected token '<'" error on the
    // frontend. Stripping the ";codecs=..." suffix before comparing
    // fixes both the rejection and (indirectly) that confusing error.
    const baseType = file.mimetype.split(';')[0].trim().toLowerCase();
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(baseType)) {
      return cb(new Error(`Only mp4, webm, or mov videos are allowed (got ${file.mimetype})`));
    }
    cb(null, true);
  },
});

// ── Get own profile ── e.g. GET /api/jobseeker/profile?user_id=123 ──
router.get('/', requireUserId, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM jobseeker_profiles WHERE user_id = ? LIMIT 1',
      [req.shondhaanUser.id]
    );
    res.json(parseProfileRow(rows[0]) || null);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Get a profile by user id (e.g. employer viewing a candidate) ────
router.get('/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM jobseeker_profiles WHERE user_id = ? LIMIT 1',
      [req.params.userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Profile not found' });
    res.json(parseProfileRow(rows[0]));
  } catch (err) {
    console.error('Get profile by id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Create/update own profile ── PUT /api/jobseeker/profile?user_id=123 ──
router.put('/', requireUserId, async (req, res) => {
  try {
    if (!req.body.full_name || !String(req.body.full_name).trim()) {
      return res.status(400).json({ message: 'full_name is required' });
    }

    const profileData = pickFields(req.body, PROFILE_FIELDS, PROFILE_BOOLEAN_FIELDS);
    const jsonData = pickJsonFields(req.body);
    if (req.body.photo_url !== undefined) profileData.photo_url = req.body.photo_url;
    if (req.body.video_cv_url !== undefined) profileData.video_cv_url = req.body.video_cv_url;

    const merged = { ...profileData, ...jsonData };
    merged.profile_completeness = calculateCompleteness({
      ...req.body,
      photo_url: req.body.photo_url,
    });

    const userId = req.shondhaanUser.id;

    const [existing] = await pool.query(
      'SELECT id FROM jobseeker_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (existing.length === 0) {
      const columns = ['user_id', ...Object.keys(merged)];
      const values = [userId, ...Object.values(merged)];
      await pool.query(
        `INSERT INTO jobseeker_profiles (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        values
      );
    } else {
      const keys = Object.keys(merged);
      if (keys.length > 0) {
        const setClause = keys.map((k) => `${k} = ?`).join(', ');
        await pool.query(
          `UPDATE jobseeker_profiles SET ${setClause} WHERE user_id = ?`,
          [...Object.values(merged), userId]
        );
      }
    }

    const [rows] = await pool.query(
      'SELECT * FROM jobseeker_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );
    res.json(parseProfileRow(rows[0]));
  } catch (err) {
    console.error('Upsert profile error:', err);
    res.status(500).json({ message: 'Server error', detail: err?.message || String(err) });
  }
});

// ── Upload profile photo ── POST /api/jobseeker/profile/photo?user_id=123 ──
router.post('/photo', requireUserId, photoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No photo uploaded' });
    const publicUrl = `/uploads/jobseeker/photos/${req.file.filename}`;
    const userId = req.shondhaanUser.id;

    const [existing] = await pool.query('SELECT id FROM jobseeker_profiles WHERE user_id = ? LIMIT 1', [userId]);
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO jobseeker_profiles (user_id, full_name, photo_url) VALUES (?, ?, ?)',
        [userId, '', publicUrl]
      );
    } else {
      await pool.query('UPDATE jobseeker_profiles SET photo_url = ? WHERE user_id = ?', [publicUrl, userId]);
    }

    res.json({ photo_url: publicUrl });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ message: err.message || 'Photo upload failed' });
  }
});

// ── Upload video CV ── POST /api/jobseeker/profile/video?user_id=123 ──
router.post('/video', requireUserId, videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video uploaded' });
    const publicUrl = `/uploads/jobseeker/videos/${req.file.filename}`;
    const userId = req.shondhaanUser.id;

    const [existing] = await pool.query('SELECT id FROM jobseeker_profiles WHERE user_id = ? LIMIT 1', [userId]);
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO jobseeker_profiles (user_id, full_name, video_cv_url) VALUES (?, ?, ?)',
        [userId, '', publicUrl]
      );
    } else {
      await pool.query('UPDATE jobseeker_profiles SET video_cv_url = ? WHERE user_id = ?', [publicUrl, userId]);
    }

    res.json({ video_cv_url: publicUrl });
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ message: err.message || 'Video upload failed' });
  }
});

// ── Delete video CV ── DELETE /api/jobseeker/profile/video?user_id=123 ──
router.delete('/video', requireUserId, async (req, res) => {
  try {
    const userId = req.shondhaanUser.id;
    const [rows] = await pool.query('SELECT video_cv_url FROM jobseeker_profiles WHERE user_id = ? LIMIT 1', [userId]);
    const existingUrl = rows[0]?.video_cv_url;

    await pool.query('UPDATE jobseeker_profiles SET video_cv_url = NULL WHERE user_id = ?', [userId]);

    if (existingUrl) {
      const filePath = path.join(__dirname, '..', existingUrl.replace(/^\//, ''));
      fs.unlink(filePath, () => {}); // best-effort cleanup
    }

    res.json({ message: 'Video CV removed' });
  } catch (err) {
    console.error('Delete video error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;