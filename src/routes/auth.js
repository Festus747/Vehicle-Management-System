const express = require('express');
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { validateRegister, validateLogin } = require('../validators/auth');

const router = express.Router();

/* ── helpers ── */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Admin or Manager access required.' });
  }
  next();
}

/**
 * POST /auth/register  — public self-registration (pending approval)
 */
router.post('/register', validate(validateRegister), async (req, res, next) => {
  try {
    const { name, email, password, role, staffId, phone } = req.body;
    const user = await authService.register({ name, email, password, role, staffId, phone });
    res.status(201).json({
      success: true,
      message: 'Registration submitted. Your account is pending admin approval.',
      user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login  — authenticate (only approved users)
 */
router.post('/login', validate(validateLogin), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json({ success: true, token: result.token, user: result.user });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me  — current user profile
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /auth/profile  — update own profile
 */
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, phone, staffId } = req.body;
    const user = await authService.updateProfile(req.user.id, { name, phone, staffId });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /auth/change-password
 */
router.put('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/* ── Admin / Manager endpoints ── */

/**
 * GET /auth/users  — list all users
 */
router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const users = await authService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/create-user  — admin creates a user (auto-approved)
 */
router.post('/create-user', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role, staffId, phone } = req.body;
    const user = await authService.createUser({ name, email, password, role, staffId, phone });
    res.status(201).json({ success: true, id: user.id, user });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /auth/approve/:id
 */
router.put('/approve/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await authService.approveUser(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /auth/reject/:id
 */
router.put('/reject/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await authService.rejectUser(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /auth/users/:id
 */
router.delete('/users/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await authService.deleteUser(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /auth/permissions/:id
 */
router.put('/permissions/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { permissions } = req.body;
    const result = await authService.updatePermissions(req.params.id, permissions || []);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
