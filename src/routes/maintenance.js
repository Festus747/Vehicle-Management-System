const express = require('express');
const maintenanceService = require('../services/maintenance.service');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * GET /maintenance
 * All authenticated users — list maintenance records.
 * Query params: vehicle_id, page, limit
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.vehicle_id) filters.vehicleId = req.query.vehicle_id;
    filters.page = parseInt(req.query.page, 10) || 1;
    filters.limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const result = await maintenanceService.getMaintenanceRecords(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /maintenance/:id
 * All authenticated users — get single maintenance record.
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const record = await maintenanceService.getMaintenanceRecordById(req.params.id);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /maintenance
 * All authenticated users — create maintenance record.
 * Accepts frontend format: { vehicleId, artisanName, companyName, contactNumber,
 * maintenanceDate, repairWork, cost, notes, resetMileage }
 */
router.post(
  '/',
  authenticate,
  async (req, res, next) => {
    try {
      // Add submitted_by from authenticated user
      const data = { ...req.body, submittedBy: req.user.name || req.user.email };
      const record = await maintenanceService.createMaintenanceRecord(data);
      res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /maintenance/:id
 * Admin only — delete a maintenance record.
 */
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    await prisma.maintenanceRecord.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Maintenance record deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
