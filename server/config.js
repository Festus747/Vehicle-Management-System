require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
    dbPath: process.env.DB_PATH || './server/db/vmt.db',
    tokenExpiry: '24h',
    maxMileage: 5000,
    warningThreshold: 200
};
