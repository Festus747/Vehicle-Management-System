const prisma = require('../lib/prisma');

/**
 * Create a new vehicle.
 * Accepts both backend (registration_number) and frontend (registration, id as fleet_number) field names.
 */
async function createVehicle(data) {
  const createData = {
    registration_number: data.registration_number || data.registration,
    fleet_number: data.fleet_number || data.id || null,
    vehicle_type: data.vehicle_type || data.type || null,
    assigned_driver_id: data.assigned_driver_id || null,
    mileage_limit: data.mileage_limit || 5000,
    current_mileage: data.current_mileage || data.mileage || 0,
    status: data.status === 'inactive' ? 'ACTIVE' : 'ACTIVE',
  };

  // Handle road worthy / insurance dates
  if (data.road_worthy_start || data.registrationDate) {
    createData.road_worthy_start = new Date(data.road_worthy_start || data.registrationDate);
  }
  if (data.road_worthy_expiry || data.registrationExpiry) {
    createData.road_worthy_expiry = new Date(data.road_worthy_expiry || data.registrationExpiry);
  }
  if (data.insurance_start || data.insuranceDate) {
    createData.insurance_start = new Date(data.insurance_start || data.insuranceDate);
  }
  if (data.insurance_expiry || data.insuranceExpiry) {
    createData.insurance_expiry = new Date(data.insurance_expiry || data.insuranceExpiry);
  }

  return prisma.vehicle.create({
    data: createData,
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
 * Find a vehicle by UUID or fleet_number.
 */
async function findVehicle(identifier) {
  // Try UUID first, then fleet_number
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  if (isUUID) {
    return prisma.vehicle.findFirst({ where: { id: identifier, deleted_at: null } });
  }
  return prisma.vehicle.findFirst({ where: { fleet_number: identifier, deleted_at: null } });
}

/**
 * Get a single vehicle by ID or fleet_number (excludes soft-deleted).
 */
async function getVehicleById(id) {
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      deleted_at: null,
      OR: [
        ...((/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) ? [{ id }] : []),
        { fleet_number: id },
      ],
    },
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
 * Accepts both backend and frontend field names.
 */
async function updateVehicle(id, data) {
  // Verify existence — look up by UUID or fleet_number
  const existing = await findVehicle(id);
  if (!existing) {
    const err = new Error('Vehicle not found.');
    err.statusCode = 404;
    throw err;
  }
  const dbId = existing.id; // always use actual UUID for update

  const updateData = {};
  if (data.registration_number !== undefined) updateData.registration_number = data.registration_number;
  if (data.registration !== undefined) updateData.registration_number = data.registration;
  if (data.assigned_driver_id !== undefined) updateData.assigned_driver_id = data.assigned_driver_id;
  if (data.mileage_limit !== undefined) updateData.mileage_limit = Number(data.mileage_limit);
  if (data.vehicle_type !== undefined) updateData.vehicle_type = data.vehicle_type;
  if (data.type !== undefined) updateData.vehicle_type = data.type;
  if (data.fleet_number !== undefined) updateData.fleet_number = data.fleet_number;
  if (data.current_mileage !== undefined) updateData.current_mileage = Number(data.current_mileage);
  if (data.mileage !== undefined) updateData.current_mileage = Number(data.mileage);

  // Date fields
  if (data.road_worthy_start !== undefined || data.registrationDate !== undefined) {
    const v = data.road_worthy_start || data.registrationDate;
    updateData.road_worthy_start = v ? new Date(v) : null;
  }
  if (data.road_worthy_expiry !== undefined || data.registrationExpiry !== undefined) {
    const v = data.road_worthy_expiry || data.registrationExpiry;
    updateData.road_worthy_expiry = v ? new Date(v) : null;
  }
  if (data.insurance_start !== undefined || data.insuranceDate !== undefined) {
    const v = data.insurance_start || data.insuranceDate;
    updateData.insurance_start = v ? new Date(v) : null;
  }
  if (data.insurance_expiry !== undefined || data.insuranceExpiry !== undefined) {
    const v = data.insurance_expiry || data.insuranceExpiry;
    updateData.insurance_expiry = v ? new Date(v) : null;
  }

  return prisma.vehicle.update({
    where: { id: dbId },
    data: updateData,
    include: { assigned_driver: { select: { id: true, name: true, email: true } } },
  });
}

/**
 * Soft-delete a vehicle (sets deleted_at timestamp).
 */
async function deleteVehicle(id) {
  const existing = await findVehicle(id);
  if (!existing) {
    const err = new Error('Vehicle not found.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.vehicle.update({
    where: { id: existing.id },
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
