import { BaseRepository } from './base.repository.js';

/**
 * Machine Repository - Handles all data access operations for machines
 * Single Responsibility: Data access for Machine entities
 */
export class MachineRepository extends BaseRepository {
  constructor(prisma) {
    super('machine', prisma);
  }

  async findById(id) {
    return this.prisma.machine.findUnique({
      where: { id },
      include: {
        model: { include: { make: true } },
        customer: true,
      },
    });
  }

  async findBySerialNumber(serialNumber) {
    return this.findOne({
      machineSerialNumber: serialNumber,
    });
  }

  async findActive(branch, includeDecommissioned = false) {
    const where = {};
    // Only filter by branch if it's provided (null means show all)
    if (branch) {
      where.branch = branch;
    }
    if (!includeDecommissioned) {
      where.isActive = true;
      where.isDecommissioned = false;
    }
    return this.findMany(where, {
      orderBy: [
        { customer: { name: 'asc' } },
        { machineSerialNumber: 'asc' },
      ],
      include: { model: { include: { make: true } }, customer: true },
    });
  }

  async search(searchTerm, branch, filters = {}) {
    const where = { ...filters, branch };

    if (searchTerm) {
      where.OR = [
        { machineSerialNumber: { contains: searchTerm, mode: 'insensitive' } },
        { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { contractReference: { contains: searchTerm, mode: 'insensitive' } },
        { model: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { model: { make: { name: { contains: searchTerm, mode: 'insensitive' } } } },
      ];
    }

    return this.findMany(where, {
      orderBy: [
        { customer: { name: 'asc' } },
        { machineSerialNumber: 'asc' },
      ],
      include: { model: { include: { make: true } }, customer: true },
    });
  }

  async findManyWithPagination(where = {}, options = {}) {
    // Extract orderBy from options if provided, otherwise use default
    const { orderBy, ...restOptions } = options;
    return this.findMany(where, {
      orderBy: orderBy || [
        { customer: { name: 'asc' } },
        { machineSerialNumber: 'asc' },
      ],
      ...restOptions,
    });
  }

  async findByIds(ids) {
    return this.findMany({
      id: { in: ids },
    });
  }

  async decommission(id) {
    return this.update(id, {
      isDecommissioned: true,
      isActive: false,
    });
  }

  async recommission(id) {
    return this.update(id, {
      isDecommissioned: false,
      isActive: true,
    });
  }
}
