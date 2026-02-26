/**
 * Generic validation middleware factory.
 * Takes a validator function that returns { valid: boolean, errors: string[] }.
 *
 * Usage:
 *   router.post('/', validate(myValidator), handler);
 */
function validate(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.body, req.params, req.query);
    if (!result.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.errors,
      });
    }
    next();
  };
}

module.exports = { validate };
