const { ROLES } = require('../config/constants');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(body) {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters.');
  }
  if (!body.email || !EMAIL_REGEX.test(body.email)) {
    errors.push('A valid email address is required.');
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
    errors.push('Password is required and must be at least 6 characters.');
  }
  if (body.role && !Object.values(ROLES).includes(body.role)) {
    errors.push(`Role must be one of: ${Object.values(ROLES).join(', ')}.`);
  }

  return { valid: errors.length === 0, errors };
}

function validateLogin(body) {
  const errors = [];

  if (!body.email || !EMAIL_REGEX.test(body.email)) {
    errors.push('A valid email address is required.');
  }
  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required.');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateRegister, validateLogin };
