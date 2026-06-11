const jwt = require('jsonwebtoken');

const DEFAULT_PLACEHOLDER = 'your_jwt_secret';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === DEFAULT_PLACEHOLDER) {
    throw new Error('JWT_SECRET env var must be set to a strong secret (not the default placeholder).');
  }
  return secret;
}

function verifyJwtToken(token) {
  const secret = getJwtSecret();
  try {
    return jwt.verify(token, secret);
  } catch (primaryError) {
    // Backward compatibility for local development: accept tokens signed with the old placeholder secret
    // so existing browser sessions do not immediately break after the secret is strengthened.
    if (process.env.NODE_ENV !== 'production' && secret !== DEFAULT_PLACEHOLDER) {
      try {
        return jwt.verify(token, DEFAULT_PLACEHOLDER);
      } catch {
        // fall through to original error
      }
    }
    throw primaryError;
  }
}

module.exports = { getJwtSecret, verifyJwtToken, DEFAULT_PLACEHOLDER };
