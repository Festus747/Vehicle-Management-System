const prisma = require('../lib/prisma');

/**
 * Create a maintenance record for a vehicle.
 */
async function createMaintenanceRecord({ vehicleId, description, mileage_at_service, service_date }) {
  // Verify vehicle exists and is not soft-deleted
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, deleted_at: null },
  });
  if (!vehicle) {
    const err = new Error('Vehicle not found.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.maintenanceRecord.create({
    data: {
      vehicle_id: vehicleId,
      description,
      mileage_at_service: Number(mileage_at_service),
      service_date: new Date(service_date),
    },
    include: {
      vehicle: { select: { id: true, registration_number: true } },
    },
  });
}

/**
 * Get maintenance records, optionally filtered by vehicle.
 */
async function getMaintenanceRecords({ vehicleId, page = 1, limit = 50 } = {}) {
  const where = {};
  if (vehicleId) where.vehicle_id = vehicleId;

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      where,
      orderBy: { service_date: 'desc' },
      skip,
      take: limit,
      include: {
        vehicle: { select: { id: true, registration_number: true } },
      },
    }),
    prisma.maintenanceRecord.count({ where }),
  ]);

  return { records, total, page, limit };
}

/**
 * Get a single maintenance record by ID.
 */
async function getMaintenanceRecordById(id) {
  const record = await prisma.maintenanceRecord.findUnique({
    where: { id },
    include: {
      vehicle: { select: { id: true, registration_number: true } },
    },
  });

  if (!record) {
    const err = new Error('Maintenance record not found.');
    err.statusCode = 404;
    throw err;
  }

  return record;
}

module.exports = { createMaintenanceRecord, getMaintenanceRecords, getMaintenanceRecordById };
