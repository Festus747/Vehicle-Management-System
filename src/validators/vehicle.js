const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateCreateVehicle(body) {
  const errors = [];

  if (!body.registration_number || typeof body.registration_number !== 'string' || body.registration_number.trim().length < 2) {
    errors.push('Registration number is required (min 2 characters).');
  }
  if (body.assigned_driver_id && !UUID_REGEX.test(body.assigned_driver_id)) {
    errors.push('assigned_driver_id must be a valid UUID.');
  }
  if (body.mileage_limit !== undefined) {
    const limit = Number(body.mileage_limit);
    if (isNaN(limit) || limit <= 0) {
      errors.push('mileage_limit must be a positive number.');
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateUpdateVehicle(body) {
  const errors = [];

  if (body.registration_number !== undefined && (typeof body.registration_number !== 'string' || body.registration_number.trim().length < 2)) {
    errors.push('Registration number must be at least 2 characters.');
  }
  if (body.assigned_driver_id !== undefined && body.assigned_driver_id !== null && !UUID_REGEX.test(body.assigned_driver_id)) {
    errors.push('assigned_driver_id must be a valid UUID or null.');
  }
  if (body.mileage_limit !== undefined) {
    const limit = Number(body.mileage_limit);
    if (isNaN(limit) || limit <= 0) {
      errors.push('mileage_limit must be a positive number.');
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateVehicle, validateUpdateVehicle };
