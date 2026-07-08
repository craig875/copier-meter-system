import { BaseRepository } from './base.repository.js';

const orderInclude = {
  product: true,
  salesAgent: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};

export class FibreOrderRepository extends BaseRepository {
  constructor(prisma) {
    super('fibreOrder', prisma);
  }

  findByIdWithRelations(id) {
    return this.prisma.fibreOrder.findUnique({
      where: { id },
      include: orderInclude,
    });
  }

  findManyWithRelations(where = {}, options = {}) {
    return this.prisma.fibreOrder.findMany({
      where,
      include: orderInclude,
      orderBy: options.orderBy ?? { orderPlacementDate: 'desc' },
      ...options,
    });
  }

  countByStatus(where = {}) {
    return this.prisma.fibreOrder.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });
  }

  countOverdue(where = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.fibreOrder.count({
      where: {
        ...where,
        status: { notIn: ['complete', 'cancelled'] },
        expectedInstallDate: { lt: today },
      },
    });
  }
}
