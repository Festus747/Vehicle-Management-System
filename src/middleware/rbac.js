/**
 * Role-Based Access Control middleware factory.
 *
 * Usage:
 *   router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), handler);
 *
 * @param  {...string} allowedRoles - Roles permitted to access the route
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
}

module.exports = { authorize };
