/**
 * Stage A — permission catalog (source of truth for keys).
 * Not enforced yet; RolePermission seeds and future checks use these keys.
 */

/** @typedef {{ key: string, group: string, label: string, description?: string }} PermissionDef */

export const PERMISSION_GROUPS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'copiers_access', label: 'Copiers — access' },
  { id: 'copiers_readings', label: 'Copiers — readings' },
  { id: 'copiers_machines', label: 'Copiers — machines' },
  { id: 'copiers_customers', label: 'Copiers — customers' },
  { id: 'copiers_consumables', label: 'Copiers — consumables' },
  { id: 'copiers_catalog', label: 'Copiers — catalog & config' },
  { id: 'connectivity', label: 'Connectivity' },
  { id: 'fibre_orders', label: 'Fibre orders' },
  { id: 'users', label: 'Users & roles' },
  { id: 'audit', label: 'Audit' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'branches', label: 'Branches' },
];

/** @type {PermissionDef[]} */
export const PERMISSION_CATALOG = [
  { key: 'dashboard.view', group: 'dashboard', label: 'View home dashboard' },

  { key: 'copiers.access', group: 'copiers_access', label: 'Access Copiers area' },

  { key: 'copiers.readings.view', group: 'copiers_readings', label: 'View meter readings' },
  { key: 'copiers.readings.submit', group: 'copiers_readings', label: 'Submit / capture readings' },
  { key: 'copiers.readings.export', group: 'copiers_readings', label: 'Export readings' },
  { key: 'copiers.readings.import', group: 'copiers_readings', label: 'Import readings' },
  { key: 'copiers.readings.delete', group: 'copiers_readings', label: 'Delete readings' },
  { key: 'copiers.readings.unlock_month', group: 'copiers_readings', label: 'Unlock submitted month' },
  { key: 'copiers.readings.uto_mark', group: 'copiers_readings', label: 'Mark Unable to obtain' },
  { key: 'copiers.readings.uto_request_override', group: 'copiers_readings', label: 'Request UTO override' },
  { key: 'copiers.readings.uto_force_override', group: 'copiers_readings', label: 'Force-approve UTO override' },
  { key: 'copiers.readings.uto_list_blocked', group: 'copiers_readings', label: 'List blocked UTO machines' },

  { key: 'copiers.machines.view', group: 'copiers_machines', label: 'View machines' },
  { key: 'copiers.machines.create', group: 'copiers_machines', label: 'Create machines' },
  { key: 'copiers.machines.update', group: 'copiers_machines', label: 'Update machines' },
  { key: 'copiers.machines.delete', group: 'copiers_machines', label: 'Delete machines' },
  { key: 'copiers.machines.import', group: 'copiers_machines', label: 'Import machines' },
  { key: 'copiers.machines.decommission', group: 'copiers_machines', label: 'Decommission machines' },
  { key: 'copiers.machines.recommission', group: 'copiers_machines', label: 'Recommission machines' },

  { key: 'copiers.customers.view', group: 'copiers_customers', label: 'View customers' },
  { key: 'copiers.customers.create', group: 'copiers_customers', label: 'Create customers' },
  { key: 'copiers.customers.update', group: 'copiers_customers', label: 'Update customers' },
  { key: 'copiers.customers.delete', group: 'copiers_customers', label: 'Delete customers' },
  { key: 'copiers.customers.import', group: 'copiers_customers', label: 'Import customers' },
  { key: 'copiers.customers.archive', group: 'copiers_customers', label: 'Archive / unarchive customers' },

  { key: 'copiers.consumables.view', group: 'copiers_consumables', label: 'View consumables' },
  { key: 'copiers.consumables.order', group: 'copiers_consumables', label: 'Record part orders' },
  { key: 'copiers.consumables.import_orders', group: 'copiers_consumables', label: 'Import part orders' },
  { key: 'copiers.consumables.delete_order', group: 'copiers_consumables', label: 'Delete part orders' },
  { key: 'copiers.consumables.parts.manage', group: 'copiers_consumables', label: 'Manage model parts' },
  { key: 'copiers.consumables.costs.increase', group: 'copiers_consumables', label: 'Increase part costs' },

  { key: 'copiers.catalog.makes_manage', group: 'copiers_catalog', label: 'Manage makes' },
  { key: 'copiers.catalog.models_manage', group: 'copiers_catalog', label: 'Manage models' },
  { key: 'copiers.catalog.import', group: 'copiers_catalog', label: 'Import makes/models/parts' },
  { key: 'copiers.config.machines', group: 'copiers_catalog', label: 'Machine configuration admin' },
  { key: 'copiers.config.pricing', group: 'copiers_catalog', label: 'Parts & pricing admin' },

  { key: 'connectivity.access', group: 'connectivity', label: 'Access Connectivity area' },
  { key: 'connectivity.reports.view', group: 'connectivity', label: 'View connectivity reports' },
  { key: 'connectivity.outages.view', group: 'connectivity', label: 'View outages' },
  { key: 'connectivity.targets.manage', group: 'connectivity', label: 'Create / edit / delete targets' },
  { key: 'connectivity.targets.check', group: 'connectivity', label: 'Run manual target checks' },
  { key: 'connectivity.time_windows.manage', group: 'connectivity', label: 'Manage alert time windows' },

  { key: 'fibre_orders.access', group: 'fibre_orders', label: 'Access Fibre Orders area' },
  { key: 'fibre_orders.view_all', group: 'fibre_orders', label: 'View all fibre orders (not agent-scoped)' },
  { key: 'fibre_orders.create', group: 'fibre_orders', label: 'Create fibre orders' },
  { key: 'fibre_orders.update', group: 'fibre_orders', label: 'Update fibre orders' },
  { key: 'fibre_orders.notes', group: 'fibre_orders', label: 'Add fibre order notes' },
  { key: 'fibre_orders.products.manage', group: 'fibre_orders', label: 'Manage fibre products' },
  { key: 'fibre_orders.update_requests.list', group: 'fibre_orders', label: 'List update requests' },
  { key: 'fibre_orders.update_requests.create', group: 'fibre_orders', label: 'Request order updates' },

  { key: 'users.view', group: 'users', label: 'View users' },
  { key: 'users.create', group: 'users', label: 'Create users' },
  { key: 'users.update', group: 'users', label: 'Update users' },
  { key: 'users.delete', group: 'users', label: 'Delete users' },
  { key: 'users.manage_roles', group: 'users', label: 'Manage roles & role permissions' },
  { key: 'users.manage_overrides', group: 'users', label: 'Manage per-user permission overrides' },
  { key: 'users.assign_owner', group: 'users', label: 'Assign Owner role' },

  { key: 'audit.view', group: 'audit', label: 'View transaction / audit history' },
  { key: 'notifications.access', group: 'notifications', label: 'Access notifications inbox' },
  { key: 'branches.switch', group: 'branches', label: 'Switch active branch when multi-granted' },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => p.key);

/** Keys that map to today's requireStrictAdmin surfaces. */
export const STRICT_ADMIN_ONLY_KEYS = [
  'copiers.readings.uto_force_override',
  'copiers.readings.uto_list_blocked',
];

/** Keys reserved for the immutable Owner role. */
export const OWNER_ONLY_KEYS = ['users.assign_owner'];

if (ALL_PERMISSION_KEYS.length !== 60) {
  throw new Error(
    `PERMISSION_CATALOG must have exactly 60 keys (found ${ALL_PERMISSION_KEYS.length})`
  );
}
