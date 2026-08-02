import { BaseRepository } from './base.repository.js';

/**
 * UserPermissionOverride data access.
 */
export class UserPermissionOverrideRepository extends BaseRepository {
  constructor(prisma) {
    super('userPermissionOverride', prisma);
  }

  async findByUserId(userId) {
    return this.prisma.userPermissionOverride.findMany({
      where: { userId },
      orderBy: { permissionKey: 'asc' },
      include: {
        grantedByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findByUserAndKey(userId, permissionKey) {
    return this.prisma.userPermissionOverride.findUnique({
      where: {
        userId_permissionKey: { userId, permissionKey },
      },
    });
  }

  async upsertOverride({ userId, permissionKey, effect, note, grantedBy }) {
    return this.prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionKey: { userId, permissionKey },
      },
      create: {
        userId,
        permissionKey,
        effect,
        note: note ?? null,
        grantedBy: grantedBy ?? null,
      },
      update: {
        effect,
        note: note === undefined ? undefined : note,
        grantedBy: grantedBy ?? null,
      },
      include: {
        grantedByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deleteByUserAndKey(userId, permissionKey) {
    return this.prisma.userPermissionOverride.delete({
      where: {
        userId_permissionKey: { userId, permissionKey },
      },
    });
  }
}
