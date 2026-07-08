import {
  canAccessMeterReadings,
  canAccessCustomers,
  canAccessConsumables,
  userHasModule,
  MODULE_COPERS,
  MODULE_CONNECTIVITY,
  MODULE_FIBRE_ORDERS,
} from '../utils/permissions.js';

/**
 * Middleware to restrict access to meter readings module (capture, history, machines)
 */
export const requireMeterReadingAccess = (req, res, next) => {
  if (!canAccessMeterReadings(req.user?.role)) {
    return res.status(403).json({ 
      error: 'You do not have access to the meter readings module. This module is only available to administrators, meter users, and capturers.' 
    });
  }
  if (!userHasModule(req.user, MODULE_COPERS)) {
    return res.status(403).json({ error: 'You do not have access to the Copiers module.' });
  }
  next();
};

/**
 * Middleware to restrict access to customers module (excludes capturer)
 */
export const requireCustomerAccess = (req, res, next) => {
  if (!canAccessCustomers(req.user?.role)) {
    return res.status(403).json({ 
      error: 'You do not have access to the customers module. This module is only available to administrators and meter users.' 
    });
  }
  if (!userHasModule(req.user, MODULE_COPERS)) {
    return res.status(403).json({ error: 'You do not have access to the Copiers module.' });
  }
  next();
};

/**
 * Middleware to restrict access to consumables module (excludes capturer)
 */
export const requireConsumableAccess = (req, res, next) => {
  if (!canAccessConsumables(req.user?.role)) {
    return res.status(403).json({ 
      error: 'You do not have access to the consumables module. This module is only available to administrators and meter users.' 
    });
  }
  if (!userHasModule(req.user, MODULE_COPERS)) {
    return res.status(403).json({ error: 'You do not have access to the Copiers module.' });
  }
  next();
};

/**
 * Middleware to restrict access to connectivity monitoring (Connectivity module grant)
 */
export const requireConnectivityAccess = (req, res, next) => {
  if (!userHasModule(req.user, MODULE_CONNECTIVITY)) {
    return res.status(403).json({ error: 'You do not have access to the Connectivity module.' });
  }
  next();
};

/**
 * Middleware to restrict connectivity management (admin, or manager with Connectivity module)
 */
export const requireConnectivityManage = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  if (req.user?.role === 'manager' && userHasModule(req.user, MODULE_CONNECTIVITY)) return next();
  return res.status(403).json({
    error:
      'Administrator or manager access with the Connectivity module is required to manage connectivity targets and settings.',
  });
};

/**
 * Middleware to restrict access to fibre order tracker module
 */
export const requireFibreOrderAccess = (req, res, next) => {
  if (!userHasModule(req.user, MODULE_FIBRE_ORDERS)) {
    return res.status(403).json({ error: 'You do not have access to the Fibre Orders module.' });
  }
  next();
};
