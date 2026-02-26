/**
 * Server entry point — used for local development.
 * On Vercel, api/index.js imports the Express app directly.
 */
require('dotenv').config();

const app = require('./app');
const config = require('./config');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  Vehicle Mileage Tracking System v3.0.0          ║
║  Server running on http://localhost:${PORT}          ║
║  Environment: ${config.nodeEnv.padEnd(33)}║
╚══════════════════════════════════════════════════╝
  `);
});
