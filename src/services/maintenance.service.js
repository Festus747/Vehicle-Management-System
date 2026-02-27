const prisma = require('../lib/prisma');

/**
 * Create a maintenance record for a vehicle.
 * Accepts frontend-format fields: vehicleId, artisanName, companyName,
 * contactNumber, repairWork, cost, notes, maintenanceDate, resetMileage, submittedBy
 */
async function createMaintenanceRecord(data) {
  const vehicleIdentifier = data.vehicleId || data.vehicle_id;

  // Find vehicle by UUID or fleet_number
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleIdentifier);
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      deleted_at: null,
      ...(isUUID ? { id: vehicleIdentifier } : { fleet_number: vehicleIdentifier }),
    },
  });
  if (!vehicle) {
    const err = new Error('Vehicle not found.');
    err.statusCode = 404;
    throw err;
  }

  const record = await prisma.maintenanceRecord.create({
    data: {
      vehicle_id: vehicle.id,
      description: data.description || data.repairWork || '',
      artisan_name: data.artisanName || data.artisan_name || null,
      company_name: data.companyName || data.company_name || null,
      contact_number: data.contactNumber || data.contact_number || null,
      repair_work: data.repairWork || data.repair_work || null,
      cost: data.cost ? Number(data.cost) : null,
      notes: data.notes || null,
      submitted_by: data.submittedBy || data.submitted_by || null,
      reset_mileage: data.resetMileage || data.reset_mileage || false,
      mileage_at_service: Number(data.mileage_at_service || vehicle.current_mileage || 0),
      service_date: new Date(data.service_date || data.maintenanceDate || new Date()),
    },
    include: {
      vehicle: { select: { id: true, registration_number: true, fleet_number: true } },
    },
  });

  // Reset mileage if requested
  if (data.resetMileage || data.reset_mileage) {
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { current_mileage: 0, status: 'ACTIVE' },
    });
  }

  return record;
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
        vehicle: { select: { id: true, registration_number: true, fleet_number: true } },
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
      vehicle: { select: { id: true, registration_number: true, fleet_number: true } },
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
