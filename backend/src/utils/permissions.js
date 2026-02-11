/**
 * Permission utilities
 * Helper functions for checking user roles and permissions
 */

/**
 * Check if user has admin privileges
 * @param {string} role - User role
 * @returns {boolean}
 */
export const hasAdminAccess = (role) => {
  return role === 'admin';
};

/**
 * Check if user is a meter user
 * @param {string} role - User role
 * @returns {boolean}
 */
export const isMeterUser = (role) => {
  return role === 'meter_user';
};

/**
 * Check if user can access meter readings module
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canAccessMeterReadings = (role) => {
  return hasAdminAccess(role) || isMeterUser(role);
};

/**
 * Check if user can manage machines (create/edit/delete)
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canManageMachines = (role) => {
  return hasAdminAccess(role) || isMeterUser(role);
};
