const prisma = require('../lib/prisma');

/**
 * Get all alerts, optionally filtered.
 */
async function getAlerts({ vehicleId, acknowledged, page = 1, limit = 50 } = {}) {
  const where = {};
  if (vehicleId) where.vehicle_id = vehicleId;
  if (acknowledged !== undefined) where.acknowledged = acknowledged;

  const skip = (page - 1) * limit;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { triggered_at: 'desc' },
      skip,
      take: limit,
      include: {
        vehicle: {
          select: { id: true, registration_number: true, status: true },
        },
      },
    }),
    prisma.alert.count({ where }),
  ]);

  return { alerts, total, page, limit };
}

/**
 * Acknowledge an alert (mark as read).
 * Alert history is retained — never deleted.
 */
async function acknowledgeAlert(alertId) {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) {
    const err = new Error('Alert not found.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.alert.update({
    where: { id: alertId },
    data: { acknowledged: true },
    include: {
      vehicle: {
        select: { id: true, registration_number: true, status: true },
      },
    },
  });
}

module.exports = { getAlerts, acknowledgeAlert };
