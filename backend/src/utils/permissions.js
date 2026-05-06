/**
 * Permission utilities
 * Helper functions for checking user roles and permissions
 */

/** Module keys (extend when adding new product areas) */
export const MODULE_COPERS = 'copiers';
export const MODULE_CONNECTIVITY = 'connectivity';
export const KNOWN_MODULES = [MODULE_COPERS, MODULE_CONNECTIVITY];

/**
 * Default modules when none specified for a role (used on create / migration)
 * @param {string} role
 * @returns {string[]}
 */
export const defaultModulesForRole = (role) => {
  if (role === 'admin') return [MODULE_COPERS, MODULE_CONNECTIVITY];
  if (role === 'manager') return [MODULE_COPERS, MODULE_CONNECTIVITY];
  if (role === 'management') return [MODULE_COPERS];
  if (role === 'sales_agent') return [MODULE_COPERS];
  if (role === 'viewer') return [MODULE_CONNECTIVITY];
  return [MODULE_COPERS];
};

/**
 * Whether a user may access a module (admins always have full access)
 * @param {{ role: string, modules?: string[] }} user
 * @param {string} moduleKey
 * @returns {boolean}
 */
export const userHasModule = (user, moduleKey) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const list = user.modules;
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.includes(moduleKey);
};

/** Drop module keys that are no longer in the product (keeps DB rows valid). */
export function sanitizeUserModules(modules) {
  if (!Array.isArray(modules)) return [];
  return modules.filter((m) => KNOWN_MODULES.includes(m));
}

/**
 * Administrator or manager (elevated operational access; managers still use module grants via userHasModule)
 * @param {string} role - User role
 * @returns {boolean}
 */
export const hasAdminAccess = (role) => {
  return role === 'admin' || role === 'manager';
};

/** Strict administrator only (rare checks) */
export const isStrictAdmin = (role) => role === 'admin';

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

/**
 * Check if user can access connectivity monitoring (dashboard, reports, outages)
 * @param {string} role - User role
 * @returns {boolean}
 */
/** @deprecated Use userHasModule(user, MODULE_CONNECTIVITY); role alone no longer gates connectivity */
export const canAccessConnectivity = (role) => {
  return hasAdminAccess(role) || role === 'viewer';
};

/**
 * Check if user can manage connectivity (CRUD targets, time windows)
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canManageConnectivity = (role) => {
  return role === 'admin' || role === 'manager';
};
