const express = require('express');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../services/activity.service');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * GET /mileage
 * List all mileage records, optionally filtered by vehicleId, date range.
 * Returns records transformed to frontend format.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const where = {};
    if (req.query.vehicleId) {
      // vehicleId could be fleet_number or UUID
      const vid = req.query.vehicleId;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vid);
      if (isUUID) {
        where.vehicle_id = vid;
      } else {
        // Look up vehicle by fleet_number first
        const v = await prisma.vehicle.findFirst({ where: { fleet_number: vid } });
        if (v) where.vehicle_id = v.id;
        else where.vehicle_id = 'none'; // No match
      }
    }

    // Date range filtering
    if (req.query.from || req.query.to) {
      where.recorded_at = {};
      if (req.query.from) where.recorded_at.gte = new Date(req.query.from);
      if (req.query.to) where.recorded_at.lte = new Date(req.query.to);
    }

    const records = await prisma.mileageRecord.findMany({
      where,
      orderBy: { recorded_at: 'desc' },
      take: 500,
      include: {
        vehicle: { select: { id: true, registration_number: true, fleet_number: true, current_mileage: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Transform to frontend format
    const transformed = records.map(r => ({
      id: r.id,
      vehicleId: r.vehicle?.fleet_number || r.vehicle?.registration_number || r.vehicle_id,
      previousMileage: 0, // Will be calculated below
      newMileage: r.recorded_mileage,
      milesAdded: 0, // Will be calculated below
      timestamp: r.recorded_at.toISOString(),
      loggedBy: r.user?.name || 'Unknown',
      notes: '',
    }));

    // Calculate previousMileage and milesAdded by looking at consecutive records per vehicle
    // Group by vehicle
    const byVehicle = {};
    for (const r of transformed) {
      if (!byVehicle[r.vehicleId]) byVehicle[r.vehicleId] = [];
      byVehicle[r.vehicleId].push(r);
    }
    for (const vRecords of Object.values(byVehicle)) {
      // Records are already sorted desc by recorded_at
      for (let i = 0; i < vRecords.length; i++) {
        const nextRecord = vRecords[i + 1]; // Previous in time (older)
        if (nextRecord) {
          vRecords[i].previousMileage = nextRecord.newMileage;
          vRecords[i].milesAdded = vRecords[i].newMileage - nextRecord.newMileage;
        } else {
          // First ever record
          vRecords[i].previousMileage = 0;
          vRecords[i].milesAdded = vRecords[i].newMileage;
        }
      }
    }

    res.json(transformed);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /mileage
 * Record a new mileage entry.
 * Accepts frontend format: { vehicleId, newMileage, notes }
 * vehicleId can be a fleet_number or a UUID.
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { vehicleId, newMileage, notes } = req.body;

    // Look up vehicle by fleet_number or by UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId);
    let vehicle = await prisma.vehicle.findFirst({
      where: {
        deleted_at: null,
        ...(isUUID ? { id: vehicleId } : { fleet_number: vehicleId }),
      },
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    if (newMileage <= vehicle.current_mileage) {
      return res.status(422).json({
        error: `New mileage (${newMileage}) must be greater than current (${vehicle.current_mileage}).`,
      });
    }

    // Create mileage record
    const record = await prisma.mileageRecord.create({
      data: {
        vehicle_id: vehicle.id,
        recorded_mileage: Number(newMileage),
        recorded_by: req.user.id,
      },
    });

    // Determine new status using maintenance-based cycle
    const limit = vehicle.mileage_limit;
    const lastService = vehicle.last_service_mileage || 0;
    const cycleMileage = newMileage - lastService;
    const remaining = limit - cycleMileage;

    let newStatus = 'ACTIVE';
    if (remaining <= 0) newStatus = 'LIMIT_EXCEEDED';
    else if (remaining <= 200) newStatus = 'NEAR_LIMIT';

    // Update vehicle mileage and status
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { current_mileage: Number(newMileage), status: newStatus },
    });

    // Create alerts if thresholds crossed
    if (newStatus === 'LIMIT_EXCEEDED' && vehicle.status !== 'LIMIT_EXCEEDED') {
      await prisma.alert.create({
        data: {
          vehicle_id: vehicle.id,
          alert_type: 'LIMIT_EXCEEDED',
          message: `Vehicle ${vehicle.fleet_number || vehicle.registration_number} reached ${limit}-mile service cap. Odometer: ${newMileage}. Miles since last service: ${cycleMileage}. Schedule maintenance immediately.`,
        },
      });
    } else if (newStatus === 'NEAR_LIMIT' && vehicle.status === 'ACTIVE') {
      await prisma.alert.create({
        data: {
          vehicle_id: vehicle.id,
          alert_type: 'NEAR_LIMIT',
          message: `Vehicle ${vehicle.fleet_number || vehicle.registration_number} approaching ${limit}-mile service cap. Odometer: ${newMileage}. Only ${remaining} miles remaining before maintenance is required.`,
        },
      });
    }

    logActivity({
      type: 'mileage',
      message: 'Mileage updated for ' + (vehicle.fleet_number || vehicle.registration_number) + ': ' + vehicle.current_mileage + ' to ' + newMileage + ' miles',
      icon: 'fa-road',
      vehicleId: vehicle.fleet_number || vehicle.registration_number,
      userId: req.user.id,
      userName: req.user.name || req.user.email,
    });

    res.status(201).json({ success: true, record });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
