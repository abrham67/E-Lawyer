const jwt = require('jsonwebtoken');
const { getJwtSecret, verifyJwtToken } = require('../utils/jwtSecret');
const SECRET = getJwtSecret();
const AUTH_DEBUG = process.env.DEBUG_AUTH === '1';

function authenticateToken(req, res, next) {
  if (AUTH_DEBUG) {
    console.log('Auth attempt - cookies:', req.cookies ? Object.keys(req.cookies) : 'none', 'header:', req.headers['authorization'] ? 'present' : 'none');
  }

  // Test hook: allow bypass with header 'x-test-user' to simplify integration tests
  // CRITICAL SECURITY: This guard is essential - test bypass ONLY works if NODE_ENV='test'
  // In production, NODE_ENV is never 'test', so this bypass is completely ineffective
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-user']) {
    try {
      req.user = JSON.parse(req.headers['x-test-user']);
      if (req.user && !req.user.id) {
        req.user.id = req.user._id || req.user.userId || req.user.sub || req.user.uid || null;
      }
      if (AUTH_DEBUG) console.warn('TEST: Using test bypass for user:', req.user?.id);
      return next();
    } catch (e) {
      if (AUTH_DEBUG) console.warn('TEST: Failed to parse test-user header:', e.message);
      // Fall through to normal JWT authentication
    }
  }

  // Try to get token from HTTP-only cookie first (preferred method)
  let token = req.cookies && req.cookies.authToken;

  // Fall back to Authorization header for backwards compatibility
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    if (AUTH_DEBUG) console.log('No token provided in cookie or header');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const user = verifyJwtToken(token);
    // Normalize common variants to always expose req.user.id as a string
    const normalized = { ...user };
    if (!normalized.id) {
      normalized.id = normalized._id || normalized.userId || normalized.sub || normalized.uid || null;
    }
    if (normalized && normalized.id && typeof normalized.id !== 'string') {
      try { normalized.id = String(normalized.id); } catch {}
    }
    req.user = normalized;
    // Block access for users who haven't been verified by an admin.
    // Keep clients accessible so they can still use their dashboard and request support.
    // Admins are exempt so they can perform verification actions.
    if (normalized && normalized.id_verified === false) {
      const role = normalized.role ? String(normalized.role).toLowerCase() : '';
      if (role === 'lawyer' || role === 'court') {
        return res.status(403).json({ error: 'Account pending admin verification' });
      }
    }
    next();
  } catch (err) {
    if (AUTH_DEBUG) console.log('Invalid token:', err.message);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

function authorizeRoles(...roles) {
  // Normalize comparison to be case-insensitive
  const allowed = roles.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    const userRole = req.user && req.user.role ? String(req.user.role).toLowerCase() : '';
    const isAdminSuperUser = userRole === 'admin';

    // Court users should have only 'court' privileges, not admin privileges
    if (!allowed.includes(userRole) && !isAdminSuperUser) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
