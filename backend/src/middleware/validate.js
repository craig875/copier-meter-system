export const validate = (schema) => (req, res, next) => {
  try {
    const parsedBody = schema.parse(req.body);
    req.body = parsedBody;
    next();
  } catch (error) {
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      const details = error.errors.map(e => {
        const field = (e.path && e.path.length > 0) ? e.path.join('.') : 'unknown';
        const message = e.message || 'Validation error';
        return { field, message };
      });

      return res.status(400).json({
        error: 'Validation failed',
        details
      });
    }
    return res.status(400).json({
      error: 'Invalid request data',
      ...(process.env.NODE_ENV !== 'production' && { message: error.message })
    });
  }
};

export const validateQuery = (schema) => (req, res, next) => {
  try {
    const cleanedQuery = {};
    Object.keys(req.query).forEach(key => {
      const value = req.query[key];
      if (value !== '' && value !== null && value !== undefined) {
        cleanedQuery[key] = value;
      }
    });

    req.query = schema.parse(cleanedQuery);
    next();
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    return res.status(400).json({
      error: 'Invalid query parameters',
      ...(process.env.NODE_ENV !== 'production' && {
        message: error.message,
        query: req.query
      })
    });
  }
};
