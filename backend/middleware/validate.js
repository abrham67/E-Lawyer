const { z } = require('zod');

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      return res.status(400).json({ error: 'Invalid request body', details: errors });
    }
    req.body = result.data;
    return next();
  };
}

module.exports = { z, validateBody };
