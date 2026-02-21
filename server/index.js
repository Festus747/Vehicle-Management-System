const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const { initDatabase } = require('./db/database');
const seed = require('./db/seed');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/mileage', require('./routes/mileage'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/import', require('./routes/import'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling
app.use(errorHandler);

// Initialize database, seed, then start server
async function start() {
    try {
        await initDatabase();
        console.log('Database initialized.');

        await seed();
        console.log('Database seeded.');

        app.listen(config.port, () => {
            console.log(`
╔══════════════════════════════════════════════╗
║   Vehicle Mileage Tracker Server v2.0.0      ║
║   Running on http://localhost:${config.port}            ║
║   Environment: ${process.env.NODE_ENV || 'development'}               ║
╚══════════════════════════════════════════════╝
            `);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

start();

module.exports = app;
