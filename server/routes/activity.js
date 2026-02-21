const express = require('express');
const { queryAll } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/activity
router.get('/', authenticate, (req, res) => {
    try {
        let logs;
        if (req.user.role === 'driver') {
            const vehicles = queryAll('SELECT id FROM vehicles WHERE driver = ?', [req.user.name]);
            if (vehicles.length === 0) {
                logs = queryAll(
                    "SELECT * FROM activity_log WHERE type = 'login' AND message LIKE ? ORDER BY timestamp DESC LIMIT 50",
                    ['%' + req.user.name + '%']
                );
            } else {
                const ids = vehicles.map(v => v.id);
                const placeholders = ids.map(() => '?').join(',');
                logs = queryAll(
                    'SELECT * FROM activity_log WHERE vehicle_id IN (' + placeholders + ') OR (type = ? AND message LIKE ?) ORDER BY timestamp DESC LIMIT 50',
                    [...ids, 'login', '%' + req.user.name + '%']
                );
            }
        } else {
            logs = queryAll('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 50');
        }
        res.json(logs.map(l => ({
            id: l.id,
            type: l.type,
            message: l.message,
            icon: l.icon || 'fa-info-circle',
            vehicleId: l.vehicle_id,
            timestamp: l.timestamp
        })));
    } catch (err) {
        console.error('Get activity error:', err);
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});

module.exports = router;
