const prisma = require('../lib/prisma');
const { VEHICLE_STATUS } = require('../config/constants');

/**
 * Mileage summary report — aggregated vehicle mileage data.
 */
async function getMileageSummary() {
  const vehicles = await prisma.vehicle.findMany({
    where: { deleted_at: null },
    include: {
      assigned_driver: { select: { id: true, name: true, email: true } },
      _count: { select: { mileage_records: true } },
    },
    orderBy: { current_mileage: 'desc' },
  });

  const totalVehicles = vehicles.length;
  const totalMileage = vehicles.reduce((sum, v) => sum + v.current_mileage, 0);
  const avgMileage = totalVehicles > 0 ? Math.round(totalMileage / totalVehicles) : 0;

  const statusBreakdown = {
    [VEHICLE_STATUS.ACTIVE]: 0,
    [VEHICLE_STATUS.NEAR_LIMIT]: 0,
    [VEHICLE_STATUS.LIMIT_EXCEEDED]: 0,
  };
  vehicles.forEach((v) => {
    statusBreakdown[v.status] = (statusBreakdown[v.status] || 0) + 1;
  });

  return {
    total_vehicles: totalVehicles,
    total_mileage: totalMileage,
    average_mileage: avgMileage,
    status_breakdown: statusBreakdown,
    vehicles: vehicles.map((v) => ({
      id: v.id,
      registration_number: v.registration_number,
      current_mileage: v.current_mileage,
      mileage_limit: v.mileage_limit,
      remaining: Math.max(0, v.mileage_limit - v.current_mileage),
      status: v.status,
      assigned_driver: v.assigned_driver,
      total_records: v._count.mileage_records,
    })),
  };
}

/**
 * Violations report — vehicles at or beyond their mileage limit.
 */
async function getViolations() {
  const violations = await prisma.vehicle.findMany({
    where: {
      deleted_at: null,
      status: { in: [VEHICLE_STATUS.NEAR_LIMIT, VEHICLE_STATUS.LIMIT_EXCEEDED] },
    },
    include: {
      assigned_driver: { select: { id: true, name: true, email: true } },
      alerts: {
        orderBy: { triggered_at: 'desc' },
      },
      mileage_records: {
        orderBy: { recorded_at: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { current_mileage: 'desc' },
  });

  return {
    total_violations: violations.length,
    vehicles: violations.map((v) => ({
      id: v.id,
      registration_number: v.registration_number,
      current_mileage: v.current_mileage,
      mileage_limit: v.mileage_limit,
      exceeded_by: Math.max(0, v.current_mileage - v.mileage_limit),
      status: v.status,
      assigned_driver: v.assigned_driver,
      alerts: v.alerts,
      recent_mileage_records: v.mileage_records,
    })),
  };
}

module.exports = { getMileageSummary, getViolations };
