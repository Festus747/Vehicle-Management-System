const express = require('express');
const { queryOne, queryAll, execute, getAlertsByVehicleIds } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function mapAlert(a) {
    return {
        id: a.id,
        vehicleId: a.vehicle_id,
        type: a.type,
        title: a.title,
        message: a.message,
        read: !!a.read,
        timestamp: a.timestamp
    };
}

// GET /api/alerts
router.get('/', authenticate, (req, res) => {
    try {
        let alerts;
        if (req.user.role === 'driver') {
            const vehicles = queryAll('SELECT id FROM vehicles WHERE driver = ?', [req.user.name]);
            const ids = vehicles.map(v => v.id);
            alerts = getAlertsByVehicleIds(ids);
        } else {
            alerts = queryAll('SELECT * FROM alerts ORDER BY timestamp DESC');
        }
        res.json(alerts.map(mapAlert));
    } catch (err) {
        console.error('Get alerts error:', err);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// PUT /api/alerts/:id/read
router.put('/:id/read', authenticate, (req, res) => {
    try {
        execute('UPDATE alerts SET read = 1 WHERE id = ?', [req.params.id]);
        const alert = queryOne('SELECT * FROM alerts WHERE id = ?', [req.params.id]);
        if (!alert) return res.status(404).json({ error: 'Alert not found' });
        res.json(mapAlert(alert));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update alert' });
    }
});

// PUT /api/alerts/read-all
router.put('/read-all', authenticate, (req, res) => {
    try {
        execute('UPDATE alerts SET read = 1');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark alerts as read' });
    }
});

// DELETE /api/alerts/:id
router.delete('/:id', authenticate, (req, res) => {
    try {
        execute('DELETE FROM alerts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

module.exports = router;
