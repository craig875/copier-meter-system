import prisma from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { assertUserNotOwnerProtected } from '../permissions/ownerProtection.js';
import { assertKeysWithinCallerSet } from '../permissions/callerSubset.js';
import { moduleRequiredForPermission } from '../permissions/effectivePermissions.js';
import { repositories } from '../repositories/index.js';

function toOverrideDto(row) {
  return {
    id: row.id,
    userId: row.userId,
    permissionKey: row.permissionKey,
    effect: row.effect,
    note: row.note,
    grantedBy: row.grantedBy,
    grantedByUser: row.grantedByUser ?? null,
    createdAt: row.createdAt,
  };
}

function inertGrantWarnings(permissionKey, effect, modules) {
  if (effect !== 'GRANT') return [];
  const required = moduleRequiredForPermission(permissionKey);
  if (required == null) return [];
  const moduleSet = new Set(Array.isArray(modules) ? modules : []);
  if (moduleSet.has(required)) return [];
  return [
    {
      code: 'GRANT_MODULE_INACTIVE',
      permissionKey,
      requiredModule: required,
      message: 'GRANT is stored but ineffective until module is assigned',
    },
  ];
}

async function loadTargetUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      modules: true,
      assignedRole: { select: { id: true, key: true, name: true } },
    },
  });
}

/**
 * Per-user GRANT/DENY override CRUD (F1).
 */
export class PermissionOverrideService {
  constructor(overrideRepo = repositories.userPermissionOverride) {
    this.overrideRepo = overrideRepo;
  }

  async list(userId) {
    const user = await loadTargetUser(userId);
    if (!user) throw new NotFoundError('User');

    const rows = await this.overrideRepo.findByUserId(userId);
    return {
      userId,
      overrides: rows.map(toOverrideDto),
    };
  }

  /**
   * @returns {Promise<{ override: object, warnings: object[], auditDetails: object }>}
   */
  async upsert(userId, body, callerPermissions, grantedBy) {
    const user = await loadTargetUser(userId);
    if (!user) throw new NotFoundError('User');
    assertUserNotOwnerProtected(user);

    const { permissionKey, effect, note } = body;

    assertKeysWithinCallerSet(
      [permissionKey],
      callerPermissions,
      'permissionKey',
      'Cannot apply an override for a permission outside your own effective set'
    );

    const previous = await this.overrideRepo.findByUserAndKey(userId, permissionKey);

    const row = await this.overrideRepo.upsertOverride({
      userId,
      permissionKey,
      effect,
      note,
      grantedBy,
    });

    const warnings = inertGrantWarnings(permissionKey, effect, user.modules);

    const auditDetails = {
      targetUserId: userId,
      targetUserEmail: user.email,
      permissionKey,
      effect,
      note: row.note,
      previousEffect: previous?.effect ?? null,
      previousNote: previous?.note ?? null,
    };

    return {
      override: toOverrideDto(row),
      warnings,
      auditDetails,
    };
  }

  /**
   * @returns {Promise<{ success: true, auditDetails: object }>}
   */
  async delete(userId, permissionKey) {
    const user = await loadTargetUser(userId);
    if (!user) throw new NotFoundError('User');
    assertUserNotOwnerProtected(user);

    const existing = await this.overrideRepo.findByUserAndKey(userId, permissionKey);
    if (!existing) throw new NotFoundError('Permission override');

    await this.overrideRepo.deleteByUserAndKey(userId, permissionKey);

    return {
      success: true,
      auditDetails: {
        targetUserId: userId,
        targetUserEmail: user.email,
        permissionKey: existing.permissionKey,
        effect: existing.effect,
        note: existing.note,
        removedOverrideId: existing.id,
      },
    };
  }
}
