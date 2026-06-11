/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitize user-provided text by removing HTML tags and scripts
 * @param {string} text - The text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text
    .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;')) // Escape HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, etc.)
    .trim();
}

/**
 * Sanitize object properties recursively
 * @param {object} obj - Object to sanitize
 * @param {array} fieldsToSanitize - Array of field names to sanitize (if null, sanitize all string fields)
 * @returns {object} - Sanitized object
 */
function sanitizeObject(obj, fieldsToSanitize = null) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

  Object.keys(sanitized).forEach((key) => {
    const value = sanitized[key];

    // Skip if field is in exclude list and a whitelist is provided
    if (fieldsToSanitize && !fieldsToSanitize.includes(key)) {
      return;
    }

    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, fieldsToSanitize);
    }
  });

  return sanitized;
}

module.exports = { sanitizeText, sanitizeObject };
