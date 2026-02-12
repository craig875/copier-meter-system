import { BaseRepository } from './base.repository.js';

/**
 * Customer Repository - Handles data access for customers
 */
export class CustomerRepository extends BaseRepository {
  constructor(prisma) {
    super('customer', prisma);
  }

  async findManyWithMachines(where = {}, options = {}) {
    return this.prisma.customer.findMany({
      where,
      include: {
        _count: { select: { machines: true } },
      },
      orderBy: { name: 'asc' },
      ...options,
    });
  }
}
