const express = require('express');
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { validateRegister, validateLogin } = require('../validators/auth');

const router = express.Router();

/**
 * POST /auth/register
 * Public — register a new user account.
 */
router.post('/register', validate(validateRegister), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await authService.register({ name, email, password, role });
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login
 * Public — authenticate and receive a JWT.
 */
router.post('/login', validate(validateLogin), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Protected — get current user's profile.
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
