import { BaseRepository } from './base.repository.js';

/**
 * Role + RolePermission data access.
 */
export class RoleRepository extends BaseRepository {
  constructor(prisma) {
    super('role', prisma);
  }

  async findManyWithPermissionsAndCounts() {
    return this.prisma.role.findMany({
      include: {
        permissions: { select: { permissionKey: true } },
        _count: { select: { users: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByIdWithPermissions(id) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { select: { permissionKey: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async findByKeyWithPermissions(key) {
    return this.prisma.role.findUnique({
      where: { key },
      include: {
        permissions: { select: { permissionKey: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async updateMeta(id, meta) {
    return this.prisma.role.update({
      where: { id },
      data: meta,
      include: {
        permissions: { select: { permissionKey: true } },
        _count: { select: { users: true } },
      },
    });
  }

  /**
   * Update optional meta fields and full-replace role_permissions in one transaction.
   * @param {string} id
   * @param {Record<string, unknown>} meta
   * @param {string[]} permissionKeys
   */
  async replacePermissionsAndMeta(id, meta, permissionKeys) {
    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(meta).length > 0) {
        await tx.role.update({ where: { id }, data: meta });
      }

      await tx.rolePermission.deleteMany({ where: { roleId: id } });

      if (permissionKeys.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionKeys.map((permissionKey) => ({
            roleId: id,
            permissionKey,
          })),
        });
      }

      return tx.role.findUnique({
        where: { id },
        include: {
          permissions: { select: { permissionKey: true } },
          _count: { select: { users: true } },
        },
      });
    });
  }
}
