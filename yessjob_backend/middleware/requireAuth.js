// middleware/requireAuth.js
//
// Authenticates a request using the token attached to the Authorization
// header. The token can be a local JWT signed with this backend's
// JWT_SECRET, a local HMAC token, OR a token issued by the central
// Shondhaan backend (verified locally, then by proxying the profile to
// the central server if needed). See utils/auth.js for details.
const { verifyShondhaanUser } = require('../utils/auth');

module.exports = async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: no token provided' });
  }

  try {
    const user = await verifyShondhaanUser(authHeader);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: invalid token' });
    }

    req.user = user; // expects decoded to have id, name, email, phone
    next();
  } catch (err) {
    console.error('[requireAuth] verify failed:', err?.message);
    return res.status(401).json({ message: 'Unauthorized: invalid token' });
  }
};

