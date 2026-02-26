/**
 * Vercel Serverless Function entry point.
 * Imports the Express app from src/ and exports it as the handler.
 */
const app = require('../src/app');

module.exports = app;
