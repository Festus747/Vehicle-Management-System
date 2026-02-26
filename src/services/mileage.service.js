const prisma = require('../lib/prisma');
const alertService = require('./alert.service');
const { VEHICLE_STATUS, ALERT_TYPE } = require('../config/constants');

/**
 * Record a new mileage entry for a vehicle.
 *
 * Business rules enforced:
 *  1. Mileage is cumulative and monotonic (new > current).
 *  2. Mileage records are immutable — insert only.
 *  3. Vehicle status is automatically updated based on thresholds.
 *  4. Alerts fire exactly once per threshold crossing.
 */
async function recordMileage({ vehicleId, recorded_mileage, recorded_by }) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock and fetch vehicle
    const vehicle = await tx.vehicle.findFirst({
      where: { id: vehicleId, deleted_at: null },
    });
    if (!vehicle) {
      const err = new Error('Vehicle not found.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Enforce monotonic mileage (prevent rollback / tampering)
    if (recorded_mileage <= vehicle.current_mileage) {
      const err = new Error(
        `Mileage must be greater than current value (${vehicle.current_mileage}). ` +
        `Mileage rollback is not permitted.`
      );
      err.statusCode = 422;
      throw err;
    }

    // 3. Create immutable mileage record
    const record = await tx.mileageRecord.create({
      data: {
        vehicle_id: vehicleId,
        recorded_mileage,
        recorded_by,
      },
    });

    // 4. Determine new status based on the vehicle's own mileage_limit
    const limit = vehicle.mileage_limit;
    const nearLimitThreshold = limit - 200; // 200 miles before cap

    let newStatus = vehicle.status;

    if (recorded_mileage >= limit) {
      newStatus = VEHICLE_STATUS.LIMIT_EXCEEDED;
    } else if (recorded_mileage >= nearLimitThreshold) {
      newStatus = VEHICLE_STATUS.NEAR_LIMIT;
    } else {
      newStatus = VEHICLE_STATUS.ACTIVE;
    }

    // 5. Update vehicle's current mileage and status
    const updatedVehicle = await tx.vehicle.update({
      where: { id: vehicleId },
      data: {
        current_mileage: recorded_mileage,
        status: newStatus,
      },
    });

    // 6. Trigger alerts exactly once per threshold crossing
    if (newStatus === VEHICLE_STATUS.LIMIT_EXCEEDED && vehicle.status !== VEHICLE_STATUS.LIMIT_EXCEEDED) {
      // Check if a LIMIT_EXCEEDED alert already exists for this vehicle
      const existingCritical = await tx.alert.findFirst({
        where: { vehicle_id: vehicleId, alert_type: ALERT_TYPE.LIMIT_EXCEEDED },
      });
      if (!existingCritical) {
        await tx.alert.create({
          data: {
            vehicle_id: vehicleId,
            alert_type: ALERT_TYPE.LIMIT_EXCEEDED,
            message: `Vehicle ${vehicle.registration_number} has exceeded its mileage limit of ${limit} miles. Current mileage: ${recorded_mileage} miles.`,
          },
        });
      }
    } else if (newStatus === VEHICLE_STATUS.NEAR_LIMIT && vehicle.status === VEHICLE_STATUS.ACTIVE) {
      // Check if a NEAR_LIMIT alert already exists
      const existingWarning = await tx.alert.findFirst({
        where: { vehicle_id: vehicleId, alert_type: ALERT_TYPE.NEAR_LIMIT },
      });
      if (!existingWarning) {
        await tx.alert.create({
          data: {
            vehicle_id: vehicleId,
            alert_type: ALERT_TYPE.NEAR_LIMIT,
            message: `Vehicle ${vehicle.registration_number} is approaching its mileage limit. Current: ${recorded_mileage} miles, Limit: ${limit} miles. Only ${limit - recorded_mileage} miles remaining.`,
          },
        });
      }
    }

    return { record, vehicle: updatedVehicle };
  });
}

/**
 * Get mileage history for a vehicle (immutable records).
 */
async function getMileageHistory(vehicleId, { page = 1, limit = 50 } = {}) {
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.mileageRecord.findMany({
      where: { vehicle_id: vehicleId },
      orderBy: { recorded_at: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.mileageRecord.count({ where: { vehicle_id: vehicleId } }),
  ]);

  return { records, total, page, limit };
}

module.exports = { recordMileage, getMileageHistory };
