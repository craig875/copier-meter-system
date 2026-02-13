import { canAccessMeterReadings, canAccessCustomers, canAccessConsumables } from '../utils/permissions.js';

/**
 * Middleware to restrict access to meter readings module (capture, history, machines)
 */
export const requireMeterReadingAccess = (req, res, next) => {
  if (!canAccessMeterReadings(req.user?.role)) {
    return res.status(403).json({ 
      error: 'You do not have access to the meter readings module. This module is only available to administrators, meter users, and capturers.' 
    });
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
  next();
};
