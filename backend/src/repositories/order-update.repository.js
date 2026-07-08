import { BaseRepository } from './base.repository.js';

export class OrderUpdateRepository extends BaseRepository {
  constructor(prisma) {
    super('orderUpdate', prisma);
  }

  findByOrderId(orderId) {
    return this.prisma.orderUpdate.findMany({
      where: { orderId },
      include: {
        updatedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
