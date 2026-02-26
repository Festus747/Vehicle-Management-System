function validateRecordMileage(body) {
  const errors = [];

  if (body.recorded_mileage === undefined || body.recorded_mileage === null) {
    errors.push('recorded_mileage is required.');
  } else {
    const mileage = Number(body.recorded_mileage);
    if (isNaN(mileage) || mileage < 0) {
      errors.push('recorded_mileage must be a non-negative number.');
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateRecordMileage };
