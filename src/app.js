const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const alertRoutes = require('./routes/alerts');
const reportRoutes = require('./routes/reports');
const maintenanceRoutes = require('./routes/maintenance');
const backupRoutes = require('./routes/backup');

const app = express();

// ──────────────────────────────────────────────
// Global middleware
// ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (non-production only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ──────────────────────────────────────────────
// Serve static frontend (public/)
// ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ──────────────────────────────────────────────
// API Routes — all prefixed with /api
// ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/backup', backupRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ──────────────────────────────────────────────
// SPA fallback — serve index.html for non-API routes
// ──────────────────────────────────────────────
app.get('*', (req, res, next) => {
  // Only serve HTML for non-API, non-file requests
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ──────────────────────────────────────────────
// Centralized error handling (must be last)
// ──────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
