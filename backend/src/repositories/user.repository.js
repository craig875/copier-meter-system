import { BaseRepository } from './base.repository.js';

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
          createdAt: true,
        },
        orderBy: { name: 'asc' },
        ...options,
      }
    );
  }
}
