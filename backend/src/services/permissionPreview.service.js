import prisma from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import {
  computeEffectivePermissions,
  moduleRequiredForPermission,
} from '../permissions/effectivePermissions.js';
import { repositories } from '../repositories/index.js';

function buildInertGrantWarnings(overrides, modules) {
  const moduleSet = new Set(Array.isArray(modules) ? modules : []);
  const warnings = [];
  for (const o of overrides ?? []) {
    if (o.effect !== 'GRANT') continue;
    const required = moduleRequiredForPermission(o.permissionKey);
    if (required != null && !moduleSet.has(required)) {
      warnings.push({
        code: 'GRANT_MODULE_INACTIVE',
        permissionKey: o.permissionKey,
        requiredModule: required,
        message: 'GRANT is stored but ineffective until module is assigned',
      });
    }
  }
  return warnings;
}

/**
 * Preview effective permissions (real user or hypothetical combo). Read-only — no audit.
 */
export class PermissionPreviewService {
  constructor(roleRepo = repositories.role) {
    this.roleRepo = roleRepo;
  }

  async preview(body) {
    if (body.userId) {
      return this.previewUser(body.userId);
    }
    return this.previewHypothetical(body);
  }

  async previewUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
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

    if (!user) throw new NotFoundError('User');
    if (!user.assignedRole) {
      return {
        permissions: [],
        meta: {
          mode: 'user',
          roleKey: null,
          moduleFiltered: true,
          warnings: [],
        },
      };
    }

    const overrides = user.permissionOverrides ?? [];
    const modules = user.modules ?? [];
    const permissions = computeEffectivePermissions({
      roleKey: user.assignedRole.key,
      rolePermissionKeys: user.assignedRole.permissions.map((p) => p.permissionKey),
      overrides,
      modules,
    });

    return {
      permissions,
      meta: {
        mode: 'user',
        roleKey: user.assignedRole.key,
        moduleFiltered: user.assignedRole.key !== 'owner',
        warnings: buildInertGrantWarnings(overrides, modules),
      },
    };
  }

  async previewHypothetical(body) {
    let roleKey = body.roleKey ?? null;
    let rolePermissionKeys = body.permissionKeys;

    if (body.roleId) {
      const role = await this.roleRepo.findByIdWithPermissions(body.roleId);
      if (!role) throw new NotFoundError('Role');
      roleKey = role.key;
      if (rolePermissionKeys === undefined) {
        rolePermissionKeys = role.permissions.map((p) => p.permissionKey);
      }
    }

    if (rolePermissionKeys === undefined) {
      rolePermissionKeys = [];
    }

    const overrides = body.overrides ?? [];
    const modules = body.modules ?? [];

    const permissions = computeEffectivePermissions({
      roleKey,
      rolePermissionKeys,
      overrides,
      modules,
    });

    return {
      permissions,
      meta: {
        mode: 'hypothetical',
        roleKey,
        moduleFiltered: roleKey !== 'owner',
        warnings: buildInertGrantWarnings(overrides, modules),
      },
    };
  }
}
