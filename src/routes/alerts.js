const express = require('express');
const alertService = require('../services/alert.service');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /alerts
 * All authenticated users — list alerts with optional filters.
 * Query params: vehicle_id, acknowledged (true/false), page, limit
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.vehicle_id) filters.vehicleId = req.query.vehicle_id;
    if (req.query.acknowledged !== undefined) filters.acknowledged = req.query.acknowledged === 'true';
    filters.page = parseInt(req.query.page, 10) || 1;
    filters.limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const result = await alertService.getAlerts(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /alerts/:id/acknowledge
 * Admin/Manager — acknowledge an alert.
 */
router.patch('/:id/acknowledge', authenticate, async (req, res, next) => {
  try {
    const alert = await alertService.acknowledgeAlert(req.params.id);
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
