const express = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * GET /activity
 * Returns recent activities, most recent first.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const activities = await prisma.activity.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    // Transform to frontend format
    const transformed = activities.map(a => ({
      id: a.id,
      type: a.type,
      message: a.message,
      icon: a.icon || 'fa-info-circle',
      vehicleId: a.vehicle_id || null,
      userName: a.user_name || null,
      timestamp: a.created_at.toISOString(),
    }));

    res.json(transformed);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
