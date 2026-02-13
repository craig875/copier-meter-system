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
 * Check if user is a capturer (capture-only, no customers/consumables)
 * @param {string} role - User role
 * @returns {boolean}
 */
export const isCapturer = (role) => {
  return role === 'capturer';
};

/**
 * Check if user can access meter readings module (capture, history, machines list)
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canAccessMeterReadings = (role) => {
  return hasAdminAccess(role) || isMeterUser(role) || isCapturer(role);
};

/**
 * Check if user can access customers module
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canAccessCustomers = (role) => {
  return hasAdminAccess(role) || isMeterUser(role);
};

/**
 * Check if user can access consumables module
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canAccessConsumables = (role) => {
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
