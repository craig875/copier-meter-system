export const validate = (schema) => (req, res, next) => {
  try {
    // Remove defaultEtaDays if present - it's calculated by the service, not provided by user
    // Also handle case where it might be sent as empty string, null, or undefined
    if (req.body && typeof req.body === 'object') {
      // Delete defaultEtaDays in all possible formats
      delete req.body.defaultEtaDays;
      delete req.body.default_eta_days;
      delete req.body['defaultEtaDays'];
      delete req.body['default_eta_days'];
      
      // Also remove from nested objects if any
      Object.keys(req.body).forEach(key => {
        if (req.body[key] && typeof req.body[key] === 'object') {
          delete req.body[key].defaultEtaDays;
          delete req.body[key].default_eta_days;
        }
      });
    }
    
    // Log incoming request for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========== VALIDATION REQUEST ==========');
      console.log('Request Body BEFORE validation:', JSON.stringify(req.body, null, 2));
      console.log('Has salesAgentId?', 'salesAgentId' in (req.body || {}));
      console.log('salesAgentId value:', req.body?.salesAgentId);
      console.log('salesAgentId type:', typeof req.body?.salesAgentId);
      console.log('Request Body Keys:', Object.keys(req.body || {}));
    }
    
    // Pass body directly - let schema handle preprocessing
    const parsedBody = schema.parse(req.body);
    req.body = parsedBody;
    
    // Log after validation
    if (process.env.NODE_ENV !== 'production') {
      console.log('Request Body AFTER validation:', JSON.stringify(req.body, null, 2));
      console.log('Has salesAgentId after?', 'salesAgentId' in (req.body || {}));
      console.log('salesAgentId value after:', req.body?.salesAgentId);
      console.log('==========================================\n');
    }
    next();
  } catch (error) {
    // Log validation errors for debugging
    console.error('\n========== VALIDATION ERROR ==========');
    console.error('Error:', error.message);
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    if (error.errors) {
      console.error('Validation Errors:', JSON.stringify(error.errors, null, 2));
    }
    console.error('==========================================\n');
    
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      const details = error.errors.map(e => {
        const field = (e.path && e.path.length > 0) ? e.path.join('.') : 'unknown';
        const message = e.message || 'Validation error';
        return { field, message };
      });
      
      // Log the details for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.error('Validation Details:', JSON.stringify(details, null, 2));
      }
      
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
    // Clean up query params - remove empty strings and convert to undefined
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
    // Log validation errors clearly
    console.error('\n========== QUERY VALIDATION ERROR ==========');
    console.error('Error:', error.message);
    console.error('Request URL:', req.originalUrl);
    console.error('Query Params:', req.query);
    if (error.errors) {
      console.error('Validation Errors:', error.errors);
    }
    console.error('==========================================\n');
    
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
