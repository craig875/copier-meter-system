import { canAccessMeterReadings } from '../utils/permissions.js';

/**
 * Middleware to restrict access to meter readings module
 */
export const requireMeterReadingAccess = (req, res, next) => {
  if (!canAccessMeterReadings(req.user?.role)) {
    return res.status(403).json({ 
      error: 'You do not have access to the meter readings module. This module is only available to administrators and meter users.' 
    });
  }
  next();
};
