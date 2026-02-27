const prisma = require('../lib/prisma');

/**
 * Log an activity to the database.
 * @param {object} opts
 * @param {string} opts.type       - 'vehicle' | 'mileage' | 'alert' | 'maintenance' | 'user' | 'system'
 * @param {string} opts.message    - Human-readable description
 * @param {string} [opts.icon]     - FontAwesome icon class (e.g. 'fa-car')
 * @param {string} [opts.vehicleId] - Fleet number or UUID of related vehicle
 * @param {string} [opts.userId]   - UUID of the user who caused the action
 * @param {string} [opts.userName] - Display name of the user
 */
async function logActivity({ type, message, icon, vehicleId, userId, userName }) {
  try {
    await prisma.activity.create({
      data: {
        type: type || 'system',
        message,
        icon: icon || 'fa-info-circle',
        vehicle_id: vehicleId || null,
        user_id: userId || null,
        user_name: userName || null,
      },
    });
  } catch (err) {
    // Activity logging should never break the main flow
    console.warn('[Activity] Failed to log activity:', err.message);
  }
}

module.exports = { logActivity };
