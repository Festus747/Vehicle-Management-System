/**
 * Centralized error handling middleware.
 * Catches all unhandled errors and returns a consistent JSON response.
 * Sensitive details are hidden in production.
 */
function errorHandler(err, req, res, _next) {
  // Log internally (never expose stack to client in production)
  console.error(`[ERROR] ${req.method} ${req.originalUrl} — ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Prisma known request errors
  if (err.code === 'P2002') {
    const target = err.meta?.target || 'field';
    return res.status(409).json({ error: `Duplicate value for ${target}. Resource already exists.` });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }

  // Custom application errors with status
  const statusCode = err.statusCode || err.status || 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({ error: message });
}

module.exports = { errorHandler };
