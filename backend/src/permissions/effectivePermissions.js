import { ALL_PERMISSION_KEYS } from './catalog.js';

/**
 * Pure computation: role keys + GRANT/DENY overrides → effective list.
 * DENY wins. Owner always starts from the full catalog (60 keys).
 *
 * @param {{ roleKey?: string|null, rolePermissionKeys?: string[], overrides?: Array<{ permissionKey: string, effect: string }> }} input
 * @returns {string[]}
 */
export function computeEffectivePermissions({
  roleKey,
  rolePermissionKeys = [],
  overrides = [],
}) {
  const base =
    roleKey === 'owner'
      ? new Set(ALL_PERMISSION_KEYS)
      : new Set(rolePermissionKeys);

  for (const o of overrides) {
    if (o.effect === 'GRANT') base.add(o.permissionKey);
  }
  for (const o of overrides) {
    if (o.effect === 'DENY') base.delete(o.permissionKey);
  }

  return [...base].sort();
}

/**
 * Load Role + RolePermission + UserPermissionOverride for a user and compute.
 * Stage B: read-only / inspectable — not used for enforcement yet.
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
  });

  return { assignedRole, permissions };
}
