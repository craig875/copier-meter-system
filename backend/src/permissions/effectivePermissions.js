import { ALL_PERMISSION_KEYS } from './catalog.js';

/**
 * Permission key prefix → User.modules value.
 * fibre_orders.* keys use underscore; the module string is hyphenated.
 */
export const PERMISSION_PREFIX_TO_MODULE = Object.freeze({
  copiers: 'copiers',
  connectivity: 'connectivity',
  fibre_orders: 'fibre-orders',
  installations: 'installations',
  crm: 'crm',
});

/** Assignee inbox keys — no product module required. */
const INSTALLATIONS_MODULE_FREE_KEYS = new Set([
  'installations.tasks.view_own',
  'installations.tasks.update_status',
]);

/**
 * Module required for a permission key, or null if module-independent
 * (dashboard / users / audit / notifications / branches, plus install assignee keys).
 *
 * @param {string} permissionKey
 * @returns {string|null}
 */
export function moduleRequiredForPermission(permissionKey) {
  if (typeof permissionKey !== 'string' || !permissionKey.includes('.')) {
    return null;
  }
  if (INSTALLATIONS_MODULE_FREE_KEYS.has(permissionKey)) {
    return null;
  }
  const prefix = permissionKey.slice(0, permissionKey.indexOf('.'));
  return PERMISSION_PREFIX_TO_MODULE[prefix] ?? null;
}

/**
 * Pure computation: role keys + GRANT/DENY overrides → effective list,
 * then (for non-owner) drop product-domain keys whose module the user lacks.
 *
 * DENY wins over GRANT. Owner always receives the full catalog (95 keys)
 * unconditionally — overrides are ignored and the module filter is skipped.
 *
 * GRANT overrides respect module boundaries (safer): an explicit GRANT cannot
 * open a product domain the user is not assigned to. Assign the module (and
 * optionally GRANT) to expand access. DENY still removes keys after filtering.
 *
 * @param {{
 *   roleKey?: string|null,
 *   rolePermissionKeys?: string[],
 *   overrides?: Array<{ permissionKey: string, effect: string }>,
 *   modules?: string[]|null,
 * }} input
 * @returns {string[]}
 */
export function computeEffectivePermissions({
  roleKey,
  rolePermissionKeys = [],
  overrides = [],
  modules = [],
}) {
  // Owner immunity: full catalog, no overrides, no module filter.
  if (roleKey === 'owner') {
    return [...ALL_PERMISSION_KEYS].sort();
  }

  const base = new Set(rolePermissionKeys);

  for (const o of overrides) {
    if (o.effect === 'GRANT') base.add(o.permissionKey);
  }
  for (const o of overrides) {
    if (o.effect === 'DENY') base.delete(o.permissionKey);
  }

  const moduleSet = new Set(Array.isArray(modules) ? modules : []);
  for (const key of [...base]) {
    const required = moduleRequiredForPermission(key);
    if (required != null && !moduleSet.has(required)) {
      base.delete(key);
    }
  }

  return [...base].sort();
}

/**
 * Load Role + RolePermission + UserPermissionOverride + modules and compute.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 * @returns {Promise<{ assignedRole: { id: string, key: string, name: string } | null, permissions: string[] }>}
 */
export async function resolveUserEffectiveAccess(prisma, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleId: true,
      modules: true,
      assignedRole: {
        select: {
          id: true,
          key: true,
          name: true,
          permissions: { select: { permissionKey: true } },
        },
      },
      permissionOverrides: {
        select: { permissionKey: true, effect: true },
      },
    },
  });

  if (!user?.assignedRole) {
    return { assignedRole: null, permissions: [] };
  }

  const assignedRole = {
    id: user.assignedRole.id,
    key: user.assignedRole.key,
    name: user.assignedRole.name,
  };

  const permissions = computeEffectivePermissions({
    roleKey: user.assignedRole.key,
    rolePermissionKeys: user.assignedRole.permissions.map((p) => p.permissionKey),
    overrides: user.permissionOverrides,
    modules: user.modules ?? [],
  });

  return { assignedRole, permissions };
}
