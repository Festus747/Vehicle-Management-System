function validateCreateMaintenance(body) {
  const errors = [];

  if (!body.description || typeof body.description !== 'string' || body.description.trim().length < 3) {
    errors.push('Description is required (min 3 characters).');
  }
  if (body.mileage_at_service === undefined || body.mileage_at_service === null) {
    errors.push('mileage_at_service is required.');
  } else {
    const val = Number(body.mileage_at_service);
    if (isNaN(val) || val < 0) {
      errors.push('mileage_at_service must be a non-negative number.');
    }
  }
  if (!body.service_date) {
    errors.push('service_date is required.');
  } else {
    const d = new Date(body.service_date);
    if (isNaN(d.getTime())) {
      errors.push('service_date must be a valid date.');
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateMaintenance };
