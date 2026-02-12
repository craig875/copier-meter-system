import { BaseRepository } from './base.repository.js';

/**
 * PartReplacement Repository - Handles data access for part orders/replacements
 */
export class PartReplacementRepository extends BaseRepository {
  constructor(prisma) {
    super('partReplacement', prisma);
  }

  async findByMachineId(machineId, options = {}) {
    const { orderBy, ...rest } = options;
    return this.findMany(
      { machineId },
      {
        orderBy: orderBy || [{ orderDate: 'desc' }],
        include: { modelPart: true },
        ...rest,
      }
    );
  }

  async findLatestByMachineAndPart(machineId, modelPartId) {
    const results = await this.findMany(
      { machineId, modelPartId },
      {
        orderBy: { orderDate: 'desc' },
        take: 1,
      }
    );
    return results[0] || null;
  }

  async findByMachineIdWithParts(machineId, limit = 50) {
    return this.findMany(
      { machineId },
      {
        orderBy: { orderDate: 'desc' },
        take: limit,
        include: { modelPart: true },
      }
    );
  }

  async createWithDetails(data) {
    return this.prisma.partReplacement.create({
      data,
      include: { modelPart: true, machine: true },
    });
  }
}
