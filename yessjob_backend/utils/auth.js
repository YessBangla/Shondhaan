// utils/auth.js
//
// Shared authentication helpers for the yessjob backend.
//
// The yessjob backend serves two kinds of clients:
//   1. The separate সন্ধান frontend standing up jobs directly against
//      this backend (which receives a token signed by the CENTRAL
//      Shondhaan backend).
//   2. Locally-issued tokens for flows that don't go through the central
//      auth (e.g. payment callbacks).
//
// So a request's Authorization Bearer token can be valid in several ways.
// `verifyShondhaanUser` tries them in order (mirroring the same helper in
// routes/jobs.js):
//   1. Verify as a local JWT signed with this backend's JWT_SECRET.
//   2. Verify as a local HMAC token issued by the wallet/auth flow.
//   3. Ask the central backend to resolve the profile for this token via
//      GET /api/users/me/profile.
const http = require('http');
const https = require('https');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SHONDHAAN_API_URL = process.env.SHONDHAAN_API_URL;
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'change-this-secret-in-env';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-should-be-in-env';

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

async function requireUser(req, res, next) {
  const user = await verifyShondhaanUser(req.headers.authorization).catch(() => null);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = user;
  req.shondhaanUser = user;
  next();
}

// Admin check on top of verifyShondhaanUser. Accepts role `admin` or
// `super_admin` (see ADMIN_ROLES in routes/jobs.js).
async function requireAdmin(req, res, next) {
  const user = await verifyShondhaanUser(req.headers.authorization).catch(() => null);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const role = getUserRole(user);
  if (role !== 'admin' && role !== 'super_admin') {
    return res.status(403).json({ message: 'Admin role is required' });
  }
  req.user = user;
  req.shondhaanUser = user;
  next();
}

module.exports = {
  getUserRole,
  verifyShondhaanUser,
  requireUser,
  requireAdmin,
};

