const express = require('express');
const vehicleService = require('../services/vehicle.service');
const mileageService = require('../services/mileage.service');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { validateCreateVehicle, validateUpdateVehicle } = require('../validators/vehicle');
const { validateRecordMileage } = require('../validators/mileage');

const router = express.Router();

/**
 * POST /vehicles
 * Admin/Manager only — create a new vehicle.
 * Accepts frontend format: { id (fleet_number), registration, type, driver, mileage, status, ... }
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      const vehicle = await vehicleService.createVehicle(req.body);
      res.status(201).json(vehicle);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /vehicles
 * All authenticated users — list all active vehicles.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const includeDeleted = req.query.include_deleted === 'true' && ['ADMIN', 'MANAGER'].includes(req.user.role);
    const vehicles = await vehicleService.getAllVehicles({ includeDeleted });
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /vehicles/:id
 * All authenticated users — get a single vehicle with recent records.
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id);
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /vehicles/:id
 * Admin/Manager only — partial update of vehicle.
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /vehicles/:id
 * Admin/Manager only — update vehicle (frontend uses PUT).
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /vehicles/:id
 * Admin only — soft-delete a vehicle.
 */
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    await vehicleService.deleteVehicle(req.params.id);
    res.json({ success: true, message: 'Vehicle deleted (soft delete).' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /vehicles/:id/mileage
 * All authenticated users — record a mileage entry.
 */
router.post(
  '/:id/mileage',
  authenticate,
  validate(validateRecordMileage),
  async (req, res, next) => {
    try {
      const result = await mileageService.recordMileage({
        vehicleId: req.params.id,
        recorded_mileage: Number(req.body.recorded_mileage),
        recorded_by: req.user.id,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /vehicles/:id/mileage-history
 * All authenticated users — get immutable mileage history.
 */
router.get('/:id/mileage-history', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const history = await mileageService.getMileageHistory(req.params.id, { page, limit });
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
