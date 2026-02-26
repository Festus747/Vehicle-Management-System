const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const config = require('../config');

/**
 * Register a new user.
 * Passwords are hashed with bcrypt before storage.
 */
async function register({ name, email, password, role }) {
  // Check for existing email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('A user with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, config.bcryptRounds);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password_hash,
      role: role || 'DRIVER',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  return user;
}

/**
 * Authenticate user and return a JWT.
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Get user profile by ID (excludes password_hash).
 */
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return user;
}

module.exports = { register, login, getProfile };
