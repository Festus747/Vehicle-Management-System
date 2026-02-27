const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const config = require('../config');

/**
 * Register a new user (self-registration).
 * User is NOT approved by default — must be approved by admin/manager.
 */
async function register({ name, email, password, role, staffId, phone }) {
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
      approved: false,
      staff_id: staffId || null,
      phone: phone || null,
    },
    select: {
      id: true, name: true, email: true, role: true,
      approved: true, staff_id: true, phone: true,
      created_at: true,
    },
  });

  return user;
}

/**
 * Admin/Manager creates a user (auto-approved).
 */
async function createUser({ name, email, password, role, staffId, phone }) {
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
      approved: true,
      staff_id: staffId || null,
      phone: phone || null,
    },
    select: {
      id: true, name: true, email: true, role: true,
      approved: true, staff_id: true, phone: true,
      created_at: true,
    },
  });

  return user;
}

/**
 * Authenticate user and return a JWT.
 * Only approved users can log in.
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  if (!user.approved) {
    const err = new Error('Your account is pending approval. Please contact an administrator.');
    err.statusCode = 403;
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
      staffId: user.staff_id,
      phone: user.phone,
      permissions: user.permissions || [],
    },
  };
}

/**
 * Get user profile by ID.
 */
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true,
      staff_id: true, phone: true, permissions: true,
      approved: true, created_at: true, updated_at: true,
    },
  });

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    ...user,
    staffId: user.staff_id,
  };
}

/**
 * Update profile (own user).
 */
async function updateProfile(userId, { name, phone, staffId }) {
  const data = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (staffId !== undefined) data.staff_id = staffId;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, name: true, email: true, role: true,
      staff_id: true, phone: true, permissions: true,
      approved: true,
    },
  });

  return { ...user, staffId: user.staff_id };
}

/**
 * List all users (admin/manager).
 */
async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { created_at: 'desc' },
    select: {
      id: true, name: true, email: true, role: true,
      approved: true, staff_id: true, phone: true,
      permissions: true, created_at: true,
    },
  });

  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    approved: u.approved,
    staffId: u.staff_id,
    phone: u.phone,
    permissions: u.permissions || [],
    created_at: u.created_at,
  }));
}

/**
 * Approve a user.
 */
async function approveUser(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { approved: true },
  });
  return { success: true };
}

/**
 * Reject (delete) a user.
 */
async function rejectUser(userId) {
  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
}

/**
 * Delete a user.
 */
async function deleteUser(userId) {
  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
}

/**
 * Change password.
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    const err = new Error('Current password is incorrect.');
    err.statusCode = 400;
    throw err;
  }

  const password_hash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash },
  });

  return { success: true };
}

/**
 * Update permissions for a user.
 */
async function updatePermissions(userId, permissions) {
  await prisma.user.update({
    where: { id: userId },
    data: { permissions },
  });
  return { success: true };
}

module.exports = {
  register,
  createUser,
  login,
  getProfile,
  updateProfile,
  listUsers,
  approveUser,
  rejectUser,
  deleteUser,
  changePassword,
  updatePermissions,
};
