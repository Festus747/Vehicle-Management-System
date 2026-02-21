const express = require('express');
const { queryAll } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/summary
router.get('/summary', authenticate, (req, res) => {
    try {
        const vehicles = queryAll('SELECT * FROM vehicles');
        const logs = queryAll('SELECT * FROM mileage_logs');
        const alerts = queryAll('SELECT * FROM alerts');

        const totalVehicles = vehicles.length;
        const activeVehicles = vehicles.filter(v => v.status === 'active').length;
        const totalMileage = vehicles.reduce((sum, v) => sum + (v.mileage || 0), 0);
        const avgMileage = totalVehicles > 0 ? Math.round(totalMileage / totalVehicles) : 0;
        const unreadAlerts = alerts.filter(a => !a.read).length;

        const typeBreakdown = {};
        vehicles.forEach(v => {
            typeBreakdown[v.type] = (typeBreakdown[v.type] || 0) + 1;
        });

        const fuelBreakdown = {};
        vehicles.forEach(v => {
            const fuel = v.fuel_type || 'Unknown';
            fuelBreakdown[fuel] = (fuelBreakdown[fuel] || 0) + 1;
        });

        res.json({
            totalVehicles,
            activeVehicles,
            inactiveVehicles: totalVehicles - activeVehicles,
            totalMileage,
            avgMileage,
            totalLogs: logs.length,
            unreadAlerts,
            totalAlerts: alerts.length,
            typeBreakdown,
            fuelBreakdown
        });
    } catch (err) {
        console.error('Report summary error:', err);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

// GET /api/reports/export/:type
router.get('/export/:type', authenticate, requireAdmin, (req, res) => {
    try {
        const type = req.params.type;
        const format = req.query.format || 'json';
        let data, filename;

        switch (type) {
            case 'mileage-history':
                data = queryAll('SELECT ml.*, v.registration FROM mileage_logs ml LEFT JOIN vehicles v ON ml.vehicle_id = v.id ORDER BY ml.timestamp DESC');
                filename = 'mileage-history';
                break;
            case 'alert-logs':
                data = queryAll('SELECT a.*, v.registration FROM alerts a LEFT JOIN vehicles v ON a.vehicle_id = v.id ORDER BY a.timestamp DESC');
                filename = 'alert-logs';
                break;
            case 'fleet-summary':
                data = queryAll('SELECT * FROM vehicles ORDER BY registration');
                filename = 'fleet-summary';
                break;
            case 'driver-usage':
                data = queryAll("SELECT driver, COUNT(*) as vehicle_count, SUM(mileage) as total_mileage, AVG(mileage) as avg_mileage FROM vehicles WHERE driver != '' GROUP BY driver");
                filename = 'driver-usage';
                break;
            default:
                return res.status(400).json({ error: 'Invalid report type' });
        }

        if (format === 'csv') {
            if (data.length === 0) return res.status(404).json({ error: 'No data' });
            const headers = Object.keys(data[0]);
            const csv = [headers.join(',')].concat(
                data.map(row => headers.map(h => {
                    const val = row[h];
                    return typeof val === 'string' && val.includes(',') ? '"' + val + '"' : val;
                }).join(','))
            ).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=' + filename + '.csv');
            return res.send(csv);
        }

        res.json(data);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

module.exports = router;
