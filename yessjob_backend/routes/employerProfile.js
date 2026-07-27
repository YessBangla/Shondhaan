// routes/employerProfile.js
const express = require('express');
const mysql = require('mysql2');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// MySQL connection pool (inline — no separate db.js file)
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

const WRITABLE_FIELDS = [
  'company_name', 'company_name_bn', 'company_logo_url', 'company_type',
  'industry_type', 'establishment_year', 'employee_count', 'website_url',
  'description', 'division', 'district', 'thana', 'address',
  'contact_person', 'contact_phone', 'contact_email', 'trade_license_url'
];

function getUserRole(user = {}) {
  return String(user.type || user.role || '').trim().toLowerCase();
}

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

/**
 * Try to verify the JWT directly. This is the primary method because the
 * frontend sends the token from the central Shondhaan backend (JWT-signed).
 * If it fails, fall back to the old HMAC-based local token or the
 * server-to-server forwarding to the central backend.
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
  if (!authHeader) {
    console.log('[auth] No Authorization header received from frontend');
    return null;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  // 1. Try direct JWT verification (shared secret between backends)
  const jwtUser = verifyJwtToken(token);
  if (jwtUser) {
    return jwtUser;
  }

  // 2. Try local HMAC-based token
  const localUser = verifyLocalAuthToken(token);
  if (localUser) {
    return localUser;
  }

  // 3. Fallback: forward to central Shondhaan backend
  const url = `${SHONDHAAN_API_URL}/api/users/me/profile`;
  console.log('[auth] Verifying token against:', url);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Cookie: `token=${token}`,
      },
    });

    console.log('[auth] Shondhaan responded with status:', response.status);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.log('[auth] Shondhaan response body:', text);
      return null;
    }

    const user = await response.json();
    console.log('[auth] Shondhaan user payload:', user);

    if (!user || !user.id) {
      console.log('[auth] Response had no usable .id field');
      return null;
    }
    return user;
  } catch (err) {
    console.error('[auth] Fetch to Shondhaan failed (is it running on that port?):', err.message);
    return null;
  }
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

function requireVerifiedUser(req, res, next) {
  // Try Authorization header first, then fall back to cookie
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  const authToUse = authHeader || (cookieToken ? `Bearer ${cookieToken}` : null);

  verifyShondhaanUser(authToUse)
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

// ─────────────────────────────────────────────────────────────
// Logo upload (multer, local disk storage)
// ─────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'employer-logos');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB, matches the frontend check

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const userId = req.shondhaanUser?.id || 'anon';
    const ext = (path.extname(file.originalname) || '').toLowerCase() || '.jpg';
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `logo_${userId}_${Date.now()}_${unique}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: MAX_LOGO_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only jpg, png, webp, or gif images are allowed'));
    }
    cb(null, true);
  },
});

// Uses your existing BACKEND_URL env var (already set in .env for
// production: https://backend-yjob.shondhaan.com). Falls back to
// localhost for local dev when BACKEND_URL isn't set.
const PUBLIC_BASE_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5050}`;

router.post('/logo', requireVerifiedUser, (req, res) => {
  logoUpload.single('logo')(req, res, async (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'ছবির সাইজ ২MB এর কম হতে হবে'
          : err.message || 'Upload failed';
      return res.status(400).json({ message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded (expected field name "logo")' });
    }

    const publicUrl = `${PUBLIC_BASE_URL}/uploads/employer-logos/${req.file.filename}`;

    try {
      const userId = req.shondhaanUser.id;
      const [existing] = await pool.query(
        'SELECT id, company_logo_url FROM employer_profiles WHERE user_id = ? LIMIT 1',
        [userId]
      );

      if (existing.length > 0) {
        await pool.query(
          'UPDATE employer_profiles SET company_logo_url = ? WHERE user_id = ?',
          [publicUrl, userId]
        );

        // Best-effort cleanup of the old logo file if it lived on this server
        const oldUrl = existing[0].company_logo_url;
        if (oldUrl && oldUrl.startsWith(`${PUBLIC_BASE_URL}/uploads/employer-logos/`)) {
          const oldFilename = path.basename(oldUrl);
          const oldPath = path.join(UPLOAD_DIR, oldFilename);
          fs.unlink(oldPath, () => {}); // ignore errors
        }
      }
      // If no profile row exists yet, we don't insert one here — the
      // registration form's POST / call will persist company_logo_url
      // as part of formData once the user finishes the rest of the form.

      res.status(200).json({ url: publicUrl });
    } catch (dbErr) {
      console.error('Logo upload DB update error:', dbErr);
      // The file is already saved to disk; still return the URL so the
      // frontend form can carry it forward even if the DB update failed.
      res.status(200).json({ url: publicUrl, warning: 'File saved but profile update failed' });
    }
  });
});

router.get('/me', requireVerifiedUser, async (req, res) => {
  try {
    const userId = req.shondhaanUser.id;
    const [rows] = await pool.query(
      'SELECT * FROM employer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('GET employer profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', requireVerifiedUser, async (req, res) => {
  try {
    const userId = req.shondhaanUser.id;

    const data = pickWritable(req.body);
    if (!data.company_name) {
      return res.status(400).json({ message: 'company_name is required' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM employer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (existing.length > 0) {
      const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(data), userId];
      await pool.query(
        `UPDATE employer_profiles SET ${setClause} WHERE user_id = ?`,
        values
      );
    } else {
      const columns = ['user_id', ...Object.keys(data)];
      const placeholders = columns.map(() => '?').join(', ');
      const values = [userId, ...Object.values(data)];
      await pool.query(
        `INSERT INTO employer_profiles (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }

    const [rows] = await pool.query(
      'SELECT * FROM employer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('POST employer profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;