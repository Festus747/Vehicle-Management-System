const express = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Admin or Manager access required.' });
  }
  next();
}

/**
 * GET /backup/export  — JSON backup of all data
 */
router.get('/export', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [users, vehicles, mileageRecords, alerts, maintenanceRecords] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, staff_id: true, phone: true, approved: true, permissions: true, created_at: true } }),
      prisma.vehicle.findMany(),
      prisma.mileageRecord.findMany(),
      prisma.alert.findMany(),
      prisma.maintenanceRecord.findMany(),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '3.0.0',
      users,
      vehicles,
      mileageRecords,
      alerts,
      maintenanceRecords,
    };

    const json = JSON.stringify(backup, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=vmt-backup-${new Date().toISOString().slice(0,10)}.json`);
    res.send(json);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /backup/db  — Same JSON backup (Postgres has no downloadable file)
 */
router.get('/db', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [users, vehicles, mileageRecords, alerts, maintenanceRecords] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, staff_id: true, phone: true, approved: true, permissions: true, created_at: true } }),
      prisma.vehicle.findMany(),
      prisma.mileageRecord.findMany(),
      prisma.alert.findMany(),
      prisma.maintenanceRecord.findMany(),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '3.0.0',
      users,
      vehicles,
      mileageRecords,
      alerts,
      maintenanceRecords,
    };

    const json = JSON.stringify(backup, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=vmt-database-${new Date().toISOString().slice(0,10)}.json`);
    res.send(json);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /backup/data/:type  — delete specific data categories
 */
router.delete('/data/:type', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { type } = req.params;

    switch (type) {
      case 'mileage-logs':
        await prisma.mileageRecord.deleteMany();
        break;
      case 'maintenance-logs':
        await prisma.maintenanceRecord.deleteMany();
        break;
      case 'alerts':
        await prisma.alert.deleteMany();
        break;
      case 'activity':
        // No activity table in schema — no-op
        break;
      case 'vehicles':
        // Delete dependent records first, then vehicles
        await prisma.mileageRecord.deleteMany();
        await prisma.alert.deleteMany();
        await prisma.maintenanceRecord.deleteMany();
        await prisma.vehicle.deleteMany();
        break;
      case 'all':
        await prisma.mileageRecord.deleteMany();
        await prisma.alert.deleteMany();
        await prisma.maintenanceRecord.deleteMany();
        await prisma.vehicle.deleteMany();
        break;
      default:
        return res.status(400).json({ error: 'Unknown data type: ' + type });
    }

    res.json({ success: true, message: type + ' deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
