const prisma = require('../lib/prisma');

/**
 * Create a new vehicle.
 */
async function createVehicle(data) {
  return prisma.vehicle.create({
    data: {
      registration_number: data.registration_number,
      assigned_driver_id: data.assigned_driver_id || null,
      mileage_limit: data.mileage_limit || 5000,
    },
    include: { assigned_driver: { select: { id: true, name: true, email: true } } },
  });
}

/**
 * Get all vehicles (excludes soft-deleted by default).
 */
async function getAllVehicles({ includeDeleted = false } = {}) {
  const where = includeDeleted ? {} : { deleted_at: null };
  return prisma.vehicle.findMany({
    where,
    include: { assigned_driver: { select: { id: true, name: true, email: true } } },
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Get a single vehicle by ID (excludes soft-deleted).
 */
async function getVehicleById(id) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, deleted_at: null },
    include: {
      assigned_driver: { select: { id: true, name: true, email: true } },
      mileage_records: { orderBy: { recorded_at: 'desc' }, take: 10 },
      alerts: { orderBy: { triggered_at: 'desc' }, take: 10 },
    },
  });

  if (!vehicle) {
    const err = new Error('Vehicle not found.');
    err.statusCode = 404;
    throw err;
  }

  return vehicle;
}

/**
 * Update vehicle fields (PATCH semantics).
 */
async function updateVehicle(id, data) {
  // Verify existence and not deleted
  const existing = await prisma.vehicle.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) {
    const err = new Error('Vehicle not found.');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (data.registration_number !== undefined) updateData.registration_number = data.registration_number;
  if (data.assigned_driver_id !== undefined) updateData.assigned_driver_id = data.assigned_driver_id;
  if (data.mileage_limit !== undefined) updateData.mileage_limit = Number(data.mileage_limit);

  return prisma.vehicle.update({
    where: { id },
    data: updateData,
    include: { assigned_driver: { select: { id: true, name: true, email: true } } },
  });
}

/**
 * Soft-delete a vehicle (sets deleted_at timestamp).
 */
async function deleteVehicle(id) {
  const existing = await prisma.vehicle.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) {
    const err = new Error('Vehicle not found.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.vehicle.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
}

module.exports = {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
};
