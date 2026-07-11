/**
 * Unable-to-obtain override request repository
 * Mirrors FibreOrderUpdateRequestRepository: pending request + resolve.
 */
export class UnableToObtainOverrideRequestRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findPendingByMachinePeriod(machineId, year, month) {
    return this.prisma.unableToObtainOverrideRequest.findFirst({
      where: {
        machineId,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findPendingByYearMonthBranch(year, month, branch) {
    const where = {
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      status: 'pending',
    };
    if (branch) where.branch = branch;
    return this.prisma.unableToObtainOverrideRequest.findMany({
      where,
      include: {
        machine: {
          include: {
            customer: { select: { id: true, name: true } },
            model: { include: { make: true } },
          },
        },
        requestedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data) {
    return this.prisma.unableToObtainOverrideRequest.create({
      data: {
        machineId: data.machineId,
        year: data.year,
        month: data.month,
        branch: data.branch,
        requestedById: data.requestedById,
        note: data.note ?? null,
      },
      include: {
        machine: {
          include: {
            customer: { select: { id: true, name: true } },
          },
        },
        requestedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  resolvePendingForMachinePeriod(machineId, year, month, resolvedById, tx = null) {
    const client = tx || this.prisma;
    return client.unableToObtainOverrideRequest.updateMany({
      where: {
        machineId,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        status: 'pending',
      },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedById,
      },
    });
  }
}
