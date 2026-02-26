// ──────────────────────────────────────────────
// Immutable business rule constants
// ──────────────────────────────────────────────

const config = require('./index');

module.exports = {
  // Mileage thresholds
  DEFAULT_MILEAGE_LIMIT: config.mileageLimit,           // 5000 miles
  EARLY_WARNING_MILES: config.warningThreshold,          // 200 miles before cap

  // Derived threshold: alert fires at (limit - warning)
  get NEAR_LIMIT_THRESHOLD() {
    return this.DEFAULT_MILEAGE_LIMIT - this.EARLY_WARNING_MILES; // 4800
  },

  // Roles
  ROLES: {
    ADMIN: 'ADMIN',
    DRIVER: 'DRIVER',
    MANAGER: 'MANAGER',
  },

  // Vehicle statuses
  VEHICLE_STATUS: {
    ACTIVE: 'ACTIVE',
    NEAR_LIMIT: 'NEAR_LIMIT',
    LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  },

  // Alert types
  ALERT_TYPE: {
    NEAR_LIMIT: 'NEAR_LIMIT',
    LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  },
};
