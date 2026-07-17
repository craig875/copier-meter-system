/**
 * Stage A — role → permission compatibility matrix (mirrors today's access).
 * Used by seed-permissions-stage-a.mjs; not read by runtime enforcement yet.
 */

import {
  ALL_PERMISSION_KEYS,
  OWNER_ONLY_KEYS,
  STRICT_ADMIN_ONLY_KEYS,
} from './catalog.js';

/** Fixed role row IDs so migration SQL and seed stay aligned. */
export const SYSTEM_ROLE_IDS = Object.freeze({
  owner: 'a0000000-0000-4000-8000-000000000001',
  admin: 'a0000000-0000-4000-8000-000000000002',
  manager: 'a0000000-0000-4000-8000-000000000003',
  meter_user: 'a0000000-0000-4000-8000-000000000004',
  capturer: 'a0000000-0000-4000-8000-000000000005',
  sales_agent: 'a0000000-0000-4000-8000-000000000006',
});

export const SYSTEM_ROLES = Object.freeze([
  {
    id: SYSTEM_ROLE_IDS.owner,
    key: 'owner',
    name: 'Owner',
    description: 'Protected full-access role (immutable)',
    isSystem: true,
    isImmutable: true,
    sortOrder: 0,
  },
  {
    id: SYSTEM_ROLE_IDS.admin,
    key: 'admin',
    name: 'Administrator',
    description: 'Full access except assigning Owner',
    isSystem: true,
    isImmutable: false,
    sortOrder: 1,
  },
  {
    id: SYSTEM_ROLE_IDS.manager,
    key: 'manager',
    name: 'Manager',
    description: 'Elevated access without strict-admin UTO tools or Owner assign',
    isSystem: true,
    isImmutable: false,
    sortOrder: 2,
  },
  {
    id: SYSTEM_ROLE_IDS.meter_user,
    key: 'meter_user',
    name: 'Meter User',
    description: 'Copiers operational access (readings, machines, customers, consumables)',
    isSystem: true,
    isImmutable: false,
    sortOrder: 3,
  },
  {
    id: SYSTEM_ROLE_IDS.capturer,
    key: 'capturer',
    name: 'Capturer',
    description: 'Meter capture only',
    isSystem: true,
    isImmutable: false,
    sortOrder: 4,
  },
  {
    id: SYSTEM_ROLE_IDS.sales_agent,
    key: 'sales_agent',
    name: 'Sales Agent',
    description: 'Fibre orders access + update requests',
    isSystem: true,
    isImmutable: false,
    sortOrder: 5,
  },
]);

const DASH = ['dashboard.view'];
const BRANCH = ['branches.switch'];
const COPIERS_ACCESS = ['copiers.access'];

const READINGS_BASE = [
  'copiers.readings.view',
  'copiers.readings.submit',
  'copiers.readings.export',
];
const READINGS_ELEVATED = [
  'copiers.readings.import',
  'copiers.readings.delete',
  'copiers.readings.unlock_month',
  'copiers.readings.uto_mark',
  'copiers.readings.uto_request_override',
];
const READINGS_STRICT = [...STRICT_ADMIN_ONLY_KEYS];

const MACHINES_VIEW = ['copiers.machines.view'];
const MACHINES_MUTATE = [
  'copiers.machines.create',
  'copiers.machines.update',
  'copiers.machines.decommission',
  'copiers.machines.recommission',
];
const MACHINES_ELEVATED = ['copiers.machines.delete', 'copiers.machines.import'];

const CUSTOMERS_VIEW_ARCHIVE = ['copiers.customers.view', 'copiers.customers.archive'];
const CUSTOMERS_ELEVATED = [
  'copiers.customers.create',
  'copiers.customers.update',
  'copiers.customers.delete',
  'copiers.customers.import',
];

const CONSUMABLES_USE = ['copiers.consumables.view', 'copiers.consumables.order'];
const CONSUMABLES_ELEVATED = [
  'copiers.consumables.import_orders',
  'copiers.consumables.delete_order',
  'copiers.consumables.parts.manage',
  'copiers.consumables.costs.increase',
];

const CATALOG_ELEVATED = [
  'copiers.catalog.makes_manage',
  'copiers.catalog.models_manage',
  'copiers.catalog.import',
  'copiers.config.machines',
  'copiers.config.pricing',
];

const CONNECTIVITY_READ = [
  'connectivity.access',
  'connectivity.reports.view',
  'connectivity.outages.view',
];
const CONNECTIVITY_MANAGE = [
  'connectivity.targets.manage',
  'connectivity.targets.check',
  'connectivity.time_windows.manage',
];

const FIBRE_ACCESS = ['fibre_orders.access'];
const FIBRE_AGENT = ['fibre_orders.update_requests.create'];
const FIBRE_ELEVATED = [
  'fibre_orders.view_all',
  'fibre_orders.create',
  'fibre_orders.update',
  'fibre_orders.notes',
  'fibre_orders.products.manage',
  'fibre_orders.update_requests.list',
];

const USERS_ELEVATED = [
  'users.view',
  'users.create',
  'users.update',
  'users.delete',
  'users.manage_roles',
  'users.manage_overrides',
];
const USERS_OWNER = [...OWNER_ONLY_KEYS];

const ADMIN_OPS = ['audit.view', 'notifications.access'];

function uniqueKeys(...groups) {
  return [...new Set(groups.flat())];
}

const MANAGER_KEYS = uniqueKeys(
  DASH,
  BRANCH,
  COPIERS_ACCESS,
  READINGS_BASE,
  READINGS_ELEVATED,
  MACHINES_VIEW,
  MACHINES_MUTATE,
  MACHINES_ELEVATED,
  CUSTOMERS_VIEW_ARCHIVE,
  CUSTOMERS_ELEVATED,
  CONSUMABLES_USE,
  CONSUMABLES_ELEVATED,
  CATALOG_ELEVATED,
  CONNECTIVITY_READ,
  CONNECTIVITY_MANAGE,
  FIBRE_ACCESS,
  FIBRE_AGENT,
  FIBRE_ELEVATED,
  USERS_ELEVATED,
  ADMIN_OPS
);

const ADMIN_KEYS = uniqueKeys(MANAGER_KEYS, READINGS_STRICT);

const METER_USER_KEYS = uniqueKeys(
  DASH,
  BRANCH,
  COPIERS_ACCESS,
  READINGS_BASE,
  MACHINES_VIEW,
  MACHINES_MUTATE,
  CUSTOMERS_VIEW_ARCHIVE,
  CONSUMABLES_USE
);

const CAPTURER_KEYS = uniqueKeys(DASH, BRANCH, COPIERS_ACCESS, READINGS_BASE);

const SALES_AGENT_KEYS = uniqueKeys(DASH, BRANCH, FIBRE_ACCESS, FIBRE_AGENT);

/**
 * Map of role key → permission keys (compatibility with today's gates).
 * @type {Readonly<Record<string, string[]>>}
 */
export const ROLE_PERMISSION_MATRIX = Object.freeze({
  owner: [...ALL_PERMISSION_KEYS],
  admin: ADMIN_KEYS,
  manager: MANAGER_KEYS,
  meter_user: METER_USER_KEYS,
  capturer: CAPTURER_KEYS,
  sales_agent: SALES_AGENT_KEYS,
});

/** Owner email promoted to the Owner role during Stage A backfill. */
export const OWNER_EMAIL = 'craig@pancom.co.za';

/**
 * Resolve the system Role.id for a legacy enum role key.
 * Used to keep User.roleId in sync when creating/updating users (Stage A dual-run).
 * @param {string} enumRole
 * @returns {string}
 */
export function resolveRoleIdForEnum(enumRole) {
  const id = SYSTEM_ROLE_IDS[enumRole];
  if (!id) {
    throw new Error(
      `No system Role row for enum role "${enumRole}". Use one of: ${Object.keys(SYSTEM_ROLE_IDS).join(', ')}`
    );
  }
  return id;
}
