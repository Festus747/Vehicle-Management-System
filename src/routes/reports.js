const express = require('express');
const reportService = require('../services/report.service');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();

/**
 * GET /reports/mileage-summary
 * Admin/Manager — full fleet mileage summary.
 */
router.get(
  '/mileage-summary',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      const summary = await reportService.getMileageSummary();
      res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /reports/violations
 * Admin/Manager — vehicles at or exceeding mileage limits.
 */
router.get(
  '/violations',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      const violations = await reportService.getViolations();
      res.json(violations);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
