const express = require('express');
const { queryAll, execute, getDb } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/backup/export - Download full database backup as JSON
router.get('/export', authenticate, requireAdmin, (req, res) => {
    try {
        const data = {
            exportDate: new Date().toISOString(),
            version: '2.0.0',
            vehicles: queryAll('SELECT * FROM vehicles'),
            mileageLogs: queryAll('SELECT * FROM mileage_logs ORDER BY timestamp DESC'),
            maintenanceLogs: queryAll('SELECT * FROM maintenance_logs ORDER BY created_at DESC'),
            alerts: queryAll('SELECT * FROM alerts ORDER BY timestamp DESC'),
            activityLog: queryAll('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 500'),
            settings: queryAll('SELECT * FROM settings')
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=vmt_backup_' + new Date().toISOString().split('T')[0] + '.json');
        res.json(data);
    } catch (err) {
        console.error('Backup export error:', err);
        res.status(500).json({ error: 'Failed to export backup' });
    }
});

// GET /api/backup/db - Download raw SQLite database file
router.get('/db', authenticate, requireAdmin, (req, res) => {
    try {
        const db = getDb();
        if (!db) return res.status(500).json({ error: 'Database not available' });

        const data = db.export();
        const buffer = Buffer.from(data);

        res.setHeader('Content-Type', 'application/x-sqlite3');
        res.setHeader('Content-Disposition', 'attachment; filename=vmt_backup_' + new Date().toISOString().split('T')[0] + '.db');
        res.send(buffer);
    } catch (err) {
        console.error('DB backup error:', err);
        res.status(500).json({ error: 'Failed to export database' });
    }
});

// DELETE /api/backup/data/:type - Delete specific data
router.delete('/data/:type', authenticate, requireAdmin, (req, res) => {
    try {
        const type = req.params.type;
        switch (type) {
            case 'mileage-logs':
                execute('DELETE FROM mileage_logs');
                // Reset vehicle mileages
                execute('UPDATE vehicles SET mileage = 0, warning_alert_sent = 0, critical_alert_sent = 0');
                break;
            case 'maintenance-logs':
                execute('DELETE FROM maintenance_logs');
                break;
            case 'alerts':
                execute('DELETE FROM alerts');
                break;
            case 'activity':
                execute('DELETE FROM activity_log');
                break;
            case 'vehicles':
                execute('DELETE FROM mileage_logs');
                execute('DELETE FROM maintenance_logs');
                execute('DELETE FROM alerts');
                execute('DELETE FROM vehicles');
                break;
            case 'all':
                execute('DELETE FROM mileage_logs');
                execute('DELETE FROM maintenance_logs');
                execute('DELETE FROM alerts');
                execute('DELETE FROM activity_log');
                execute('DELETE FROM vehicles');
                break;
            default:
                return res.status(400).json({ error: 'Invalid data type' });
        }

        execute(
            'INSERT INTO activity_log (id, type, message, icon) VALUES (?, ?, ?, ?)',
            ['act_' + Date.now(), 'data_deleted', type + ' data cleared by ' + req.user.name, 'fa-trash']
        );

        res.json({ success: true, message: type + ' data has been deleted' });
    } catch (err) {
        console.error('Delete data error:', err);
        res.status(500).json({ error: 'Failed to delete data' });
    }
});

module.exports = router;
