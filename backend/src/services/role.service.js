import { NotFoundError, ValidationError } from '../utils/errors.js';
import { assertRoleMutable } from '../permissions/ownerProtection.js';
import { assertKeysWithinCallerSet } from '../permissions/callerSubset.js';
import { repositories } from '../repositories/index.js';

function toRoleDto(role) {
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isImmutable: role.isImmutable,
    sortOrder: role.sortOrder,
    permissionKeys: (role.permissions ?? [])
      .map((p) => p.permissionKey)
      .sort(),
    userCount: role._count?.users ?? 0,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

/**
 * Role listing and matrix/metadata updates (F1 — no create/delete custom roles).
 */
export class RoleService {
  constructor(roleRepo = repositories.role) {
    this.roleRepo = roleRepo;
  }

  async listRoles() {
    const roles = await this.roleRepo.findManyWithPermissionsAndCounts();
    return { roles: roles.map(toRoleDto) };
  }

  async getRole(id) {
    const role = await this.roleRepo.findByIdWithPermissions(id);
    if (!role) throw new NotFoundError('Role');
    return { role: toRoleDto(role) };
  }

  /**
   * @param {string} roleId
   * @param {{ name?: string, description?: string|null, permissionKeys?: string[] }} body
   * @param {string[]} callerPermissions
   * @returns {Promise<{ role: object, auditDetails: object }>}
   */
  async updateRole(roleId, body, callerPermissions) {
    const role = await this.roleRepo.findByIdWithPermissions(roleId);
    if (!role) throw new NotFoundError('Role');

    assertRoleMutable(role);

    const meta = {};
    if (body.name !== undefined) meta.name = body.name;
    if (body.description !== undefined) meta.description = body.description;

    const oldKeys = (role.permissions ?? []).map((p) => p.permissionKey).sort();

    // Metadata-only: omit permissionKeys entirely — skip subset + full-replace.
    if (body.permissionKeys === undefined) {
      if (Object.keys(meta).length === 0) {
        throw new ValidationError('Provide name, description, and/or permissionKeys');
      }

      const updated = await this.roleRepo.updateMeta(roleId, meta);
      const dto = toRoleDto(updated);

      const auditDetails = {
        roleKey: role.key,
        path: 'metadata',
        changes: {},
      };
      if (body.name !== undefined && body.name !== role.name) {
        auditDetails.changes.name = { from: role.name, to: body.name };
      }
      if (body.description !== undefined && body.description !== role.description) {
        auditDetails.changes.description = {
          from: role.description,
          to: body.description,
        };
      }

      return { role: dto, auditDetails };
    }

    // Matrix path: permissionKeys present (including []) ⇒ full replace + subset.
    assertKeysWithinCallerSet(
      body.permissionKeys,
      callerPermissions,
      'permissionKeys',
      'Cannot assign permissions outside your own effective set'
    );

    const newKeys = [...new Set(body.permissionKeys)].sort();
    const updated = await this.roleRepo.replacePermissionsAndMeta(
      roleId,
      meta,
      newKeys
    );
    const dto = toRoleDto(updated);

    const oldSet = new Set(oldKeys);
    const newSet = new Set(newKeys);
    const auditDetails = {
      roleKey: role.key,
      path: 'matrix',
      changes: {
        permissionKeys: {
          from: oldKeys,
          to: newKeys,
          added: newKeys.filter((k) => !oldSet.has(k)),
          removed: oldKeys.filter((k) => !newSet.has(k)),
        },
      },
    };
    if (body.name !== undefined && body.name !== role.name) {
      auditDetails.changes.name = { from: role.name, to: body.name };
    }
    if (body.description !== undefined && body.description !== role.description) {
      auditDetails.changes.description = {
        from: role.description,
        to: body.description,
      };
    }

    return { role: dto, auditDetails };
  }
}
