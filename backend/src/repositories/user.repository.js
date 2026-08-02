import { BaseRepository } from './base.repository.js';

/** Minimal Role include so publicUser can compute isOwnerProtected. */
const ASSIGNED_ROLE_KEY = { select: { key: true } };

/**
 * User Repository - Handles all data access operations for users
 * Single Responsibility: Data access for User entities
 */
export class UserRepository extends BaseRepository {
  constructor(prisma) {
    super('user', prisma);
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }

  /**
   * Include assignedRole.key so serializers share ownerProtection.isOwnerProtected.
   */
  async findById(id) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { assignedRole: ASSIGNED_ROLE_KEY },
    });
  }

  async create(data) {
    return this.prisma.user.create({
      data,
      include: { assignedRole: ASSIGNED_ROLE_KEY },
    });
  }

  async update(id, data) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { assignedRole: ASSIGNED_ROLE_KEY },
    });
  }

  async findAll(options = {}) {
    return this.findMany(
      {},
      {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branch: true,
          modules: true,
          createdAt: true,
          assignedRole: ASSIGNED_ROLE_KEY,
          branchAccess: {
            select: { branch: true },
            orderBy: { branch: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
        ...options,
      }
    );
  }
}
