const express = require('express');
const maintenanceService = require('../services/maintenance.service');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { validateCreateMaintenance } = require('../validators/maintenance');

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
 */
router.post(
  '/',
  authenticate,
  validate(validateCreateMaintenance),
  async (req, res, next) => {
    try {
      const { vehicle_id, description, mileage_at_service, service_date } = req.body;
      const record = await maintenanceService.createMaintenanceRecord({
        vehicleId: vehicle_id,
        description,
        mileage_at_service,
        service_date,
      });
      res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
