require('dotenv').config();

module.exports = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Business rules (configurable via env, with safe defaults)
  mileageLimit: parseInt(process.env.MILEAGE_LIMIT, 10) || 5000,
  warningThreshold: parseInt(process.env.WARNING_THRESHOLD, 10) || 200,

  // bcrypt
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
};
