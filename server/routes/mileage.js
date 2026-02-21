const express = require('express');
const config = require('../config');
const { queryOne, queryAll, execute } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/mileage
router.get('/', authenticate, (req, res) => {
    try {
        let logs;
        if (req.user.role === 'driver') {
            const vehicles = queryAll('SELECT id FROM vehicles WHERE driver = ?', [req.user.name]);
            if (vehicles.length === 0) return res.json([]);
            const ids = vehicles.map(v => v.id);
            const placeholders = ids.map(() => '?').join(',');
            logs = queryAll(
                'SELECT * FROM mileage_logs WHERE vehicle_id IN (' + placeholders + ') ORDER BY timestamp DESC',
                ids
            );
        } else {
            logs = queryAll('SELECT * FROM mileage_logs ORDER BY timestamp DESC');
        }
        res.json(logs.map(l => ({
            id: l.id,
            vehicleId: l.vehicle_id,
            previousMileage: l.previous_mileage,
            newMileage: l.new_mileage,
            milesAdded: l.miles_added,
            loggedBy: l.logged_by,
            notes: l.notes || '',
            timestamp: l.timestamp
        })));
    } catch (err) {
        console.error('Get mileage error:', err);
        res.status(500).json({ error: 'Failed to fetch mileage logs' });
    }
});

// POST /api/mileage
router.post('/', authenticate, (req, res) => {
    try {
        const { vehicleId, newMileage, notes } = req.body;
        if (!vehicleId || newMileage === undefined) {
            return res.status(400).json({ error: 'vehicleId and newMileage required' });
        }

        const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

        const previousMileage = vehicle.mileage || 0;
        const milesAdded = newMileage - previousMileage;
        const logId = 'ML' + Date.now();

        execute(
            'INSERT INTO mileage_logs (id, vehicle_id, previous_mileage, new_mileage, miles_added, logged_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [logId, vehicleId, previousMileage, newMileage, milesAdded, req.user.name, notes || '']
        );

        execute(
            'UPDATE vehicles SET mileage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newMileage, vehicleId]
        );

        // Check thresholds
        const maxMileage = config.maxMileage;
        const warningThreshold = config.warningThreshold;
        const remaining = maxMileage - newMileage;

        if (remaining <= 0 && !vehicle.critical_alert_sent) {
            execute(
                'INSERT INTO alerts (id, vehicle_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
                ['alert_' + Date.now(), vehicleId, 'critical', 'Mileage Limit Exceeded', vehicle.registration + ' has exceeded the ' + maxMileage + ' km limit with ' + newMileage + ' km']
            );
            execute('UPDATE vehicles SET critical_alert_sent = 1 WHERE id = ?', [vehicleId]);
        } else if (remaining <= warningThreshold && remaining > 0 && !vehicle.warning_alert_sent) {
            execute(
                'INSERT INTO alerts (id, vehicle_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
                ['alert_' + Date.now(), vehicleId, 'warning', 'Approaching Mileage Limit', vehicle.registration + ' is within ' + remaining + ' km of the ' + maxMileage + ' km limit']
            );
            execute('UPDATE vehicles SET warning_alert_sent = 1 WHERE id = ?', [vehicleId]);
        }

        execute(
            'INSERT INTO activity_log (id, type, message, icon, vehicle_id) VALUES (?, ?, ?, ?, ?)',
            ['act_' + Date.now(), 'mileage_update', vehicle.registration + ' mileage updated to ' + newMileage + ' km', 'fa-tachometer-alt', vehicleId]
        );

        const log = queryOne('SELECT * FROM mileage_logs WHERE id = ?', [logId]);
        res.status(201).json({
            id: log.id,
            vehicleId: log.vehicle_id,
            previousMileage: log.previous_mileage,
            newMileage: log.new_mileage,
            milesAdded: log.miles_added,
            loggedBy: log.logged_by,
            notes: log.notes || '',
            timestamp: log.timestamp
        });
    } catch (err) {
        console.error('Create mileage error:', err);
        res.status(500).json({ error: 'Failed to log mileage' });
    }
});

module.exports = router;
