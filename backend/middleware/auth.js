const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (process.env.NODE_ENV !== 'production') {
    // Debug only: show incoming auth header format (not the token value in production logs)
    console.log('Authorization header:', authHeader ? authHeader.split(' ')[0] + ' ***' : 'none');
  }
  // Test hook: allow bypass with header 'x-test-user' to simplify integration tests
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-user']) {
    try {
      req.user = JSON.parse(req.headers['x-test-user']);
      // Normalize id field for downstream usage
      if (req.user && !req.user.id) {
        req.user.id = req.user._id || req.user.userId || req.user.sub || req.user.uid || null;
      }
      return next();
    } catch (e) {
      // fallthrough to normal auth
    }
  }
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    if (process.env.NODE_ENV !== 'production') console.log('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      if (process.env.NODE_ENV !== 'production') console.log('Invalid token:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    // Normalize common variants to always expose req.user.id as a string
    const normalized = { ...user };
    if (!normalized.id) {
      normalized.id = normalized._id || normalized.userId || normalized.sub || normalized.uid || null;
    }
    if (normalized && normalized.id && typeof normalized.id !== 'string') {
      try { normalized.id = String(normalized.id); } catch {}
    }
    req.user = normalized;
    next();
  });
}

function authorizeRoles(...roles) {
  // Normalize comparison to be case-insensitive and support role arrays
  const allowed = roles.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    const userRole = req.user && req.user.role ? String(req.user.role).toLowerCase() : '';
    // Treat 'court' as equivalent to 'admin' if admin is required
    const isCourtActingAsAdmin = allowed.includes('admin') && userRole === 'court';
    if (!allowed.includes(userRole) && !isCourtActingAsAdmin) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
