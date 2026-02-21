const express = require('express');
const { queryOne, queryAll, execute } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings
router.get('/', authenticate, (req, res) => {
    try {
        const rows = queryAll('SELECT * FROM settings');
        const settings = {};
        for (const row of rows) {
            let val = row.value;
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (!isNaN(val) && val !== '') val = Number(val);
            settings[row.key] = val;
        }
        res.json(settings);
    } catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PUT /api/settings
router.put('/', authenticate, requireAdmin, (req, res) => {
    try {
        const updates = req.body;
        for (const [key, value] of Object.entries(updates)) {
            const existing = queryOne('SELECT key FROM settings WHERE key = ?', [key]);
            if (existing) {
                execute('UPDATE settings SET value = ? WHERE key = ?', [String(value), key]);
            } else {
                execute('INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
            }
        }

        execute(
            'INSERT INTO activity_log (id, type, message, icon) VALUES (?, ?, ?, ?)',
            ['act_' + Date.now(), 'settings_updated', 'Settings updated by ' + req.user.name, 'fa-cog']
        );

        const rows = queryAll('SELECT * FROM settings');
        const settings = {};
        for (const row of rows) {
            let val = row.value;
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (!isNaN(val) && val !== '') val = Number(val);
            settings[row.key] = val;
        }
        res.json(settings);
    } catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
