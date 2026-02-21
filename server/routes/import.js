const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { execute } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const os = require('os');
const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

function parseFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

// POST /api/import/vehicles
router.post('/vehicles', authenticate, requireAdmin, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const rows = parseFile(req.file.path);
        let imported = 0;

        for (const row of rows) {
            const id = row.id || row.ID || 'VH' + Date.now() + '_' + imported;
            const registration = row.registration || row.Registration || row['Reg No'] || '';
            const type = row.type || row.Type || row['Vehicle Type'] || 'Sedan';
            const driver = row.driver || row.Driver || '';
            const mileage = Number(row.mileage || row.Mileage || 0);
            const status = row.status || row.Status || 'active';
            const fuelType = row.fuelType || row['Fuel Type'] || 'Diesel';

            if (registration) {
                try {
                    execute(
                        'INSERT OR REPLACE INTO vehicles (id, registration, type, driver, mileage, status, fuel_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [id, registration, type, driver, mileage, status, fuelType]
                    );
                    imported++;
                } catch (e) {
                    console.error('Import vehicle row error:', e.message);
                }
            }
        }

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        execute(
            'INSERT INTO activity_log (id, type, message, icon) VALUES (?, ?, ?, ?)',
            ['act_' + Date.now(), 'import', imported + ' vehicles imported', 'fa-file-import']
        );

        res.json({ imported, total: rows.length });
    } catch (err) {
        console.error('Import vehicles error:', err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Failed to import vehicles' });
    }
});

// POST /api/import/mileage
router.post('/mileage', authenticate, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const rows = parseFile(req.file.path);
        let imported = 0;

        for (const row of rows) {
            const vehicleId = row.vehicleId || row['Vehicle ID'] || row.vehicle_id || '';
            const newMileage = Number(row.newMileage || row['New Mileage'] || row.mileage || 0);
            const notes = row.notes || row.Notes || '';

            if (vehicleId && newMileage) {
                try {
                    const logId = 'ML' + Date.now() + '_' + imported;
                    execute(
                        'INSERT INTO mileage_logs (id, vehicle_id, previous_mileage, new_mileage, miles_added, logged_by, notes) VALUES (?, ?, 0, ?, ?, ?, ?)',
                        [logId, vehicleId, newMileage, newMileage, req.user.name, notes]
                    );
                    execute('UPDATE vehicles SET mileage = ? WHERE id = ?', [newMileage, vehicleId]);
                    imported++;
                } catch (e) {
                    console.error('Import mileage row error:', e.message);
                }
            }
        }

        fs.unlinkSync(req.file.path);

        execute(
            'INSERT INTO activity_log (id, type, message, icon) VALUES (?, ?, ?, ?)',
            ['act_' + Date.now(), 'import', imported + ' mileage records imported', 'fa-file-import']
        );

        res.json({ imported, total: rows.length });
    } catch (err) {
        console.error('Import mileage error:', err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Failed to import mileage' });
    }
});

module.exports = router;
