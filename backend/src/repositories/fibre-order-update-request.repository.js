import { BaseRepository } from './base.repository.js';

const requestInclude = {
  order: {
    include: {
      product: true,
      salesAgent: { select: { id: true, name: true, email: true } },
    },
  },
  requestedBy: { select: { id: true, name: true, email: true } },
};

export class FibreOrderUpdateRequestRepository extends BaseRepository {
  constructor(prisma) {
    super('fibreOrderUpdateRequest', prisma);
  }

  findPendingByOrderId(orderId) {
    return this.prisma.fibreOrderUpdateRequest.findFirst({
      where: { orderId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  findManyPending(where = {}) {
    return this.prisma.fibreOrderUpdateRequest.findMany({
      where: { status: 'pending', ...where },
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data) {
    return this.prisma.fibreOrderUpdateRequest.create({
      data: {
        orderId: data.orderId,
        requestedById: data.requestedById,
        note: data.note ?? null,
      },
      include: requestInclude,
    });
  }

  resolvePendingForOrder(orderId, resolvedById) {
    return this.prisma.fibreOrderUpdateRequest.updateMany({
      where: { orderId, status: 'pending' },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedById,
      },
    });
  }

  countPending(where = {}) {
    const orderFilter = {};
    if (where.branch) orderFilter.branch = where.branch;
    if (where.salesAgentId) orderFilter.salesAgentId = where.salesAgentId;
    return this.prisma.fibreOrderUpdateRequest.count({
      where: {
        status: 'pending',
        ...(Object.keys(orderFilter).length > 0 ? { order: orderFilter } : {}),
      },
    });
  }
}
