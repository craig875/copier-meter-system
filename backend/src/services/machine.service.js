import { repositories } from '../repositories/index.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

/**
 * Machine Service - Business logic for machines
 * Single Responsibility: Business logic for machine operations
 */
export class MachineService {
  constructor(repos = repositories) {
    this.machineRepo = repos.machine;
  }

  /**
   * Get machines with pagination and search
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  async getMachines(filters = {}) {
    const { page = 1, limit = 50, search, isActive, branch } = filters;
    const skip = (page - 1) * limit;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    // Only filter by branch if it's provided and is a valid enum value
    // null/undefined/empty string means show all
    if (branch && branch !== 'null' && branch !== 'undefined' && branch !== '') {
      // Validate branch is a valid enum value
      if (branch === 'JHB' || branch === 'CT') {
        where.branch = branch;
      } else {
        throw new ValidationError(`Invalid branch value: ${branch}. Must be 'JHB' or 'CT'`);
      }
    }

    const whereClause = { ...where };
    if (search) {
      whereClause.OR = [
        { machineSerialNumber: { contains: search, mode: 'insensitive' } },
        { customer: { contains: search, mode: 'insensitive' } },
        { contractReference: { contains: search, mode: 'insensitive' } },
        { model: { name: { contains: search, mode: 'insensitive' } } },
        { model: { make: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [machines, total] = await Promise.all([
      this.machineRepo.findManyWithPagination(whereClause, {
        skip,
        take: parseInt(limit),
        include: { model: { include: { make: true } }, customer: true },
      }),
      this.machineRepo.count(whereClause),
    ]);

    return {
      machines,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single machine by ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getMachine(id) {
    const machine = await this.machineRepo.findById(id);
    if (!machine) {
      throw new NotFoundError('Machine');
    }
    return { machine };
  }

  /**
   * Create a new machine
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createMachine(data) {
    // Check for duplicate serial number
    const existing = await this.machineRepo.findBySerialNumber(data.machineSerialNumber);
    if (existing) {
      throw new ConflictError('Machine serial number already exists');
    }

    const machine = await this.machineRepo.create(data);
    return { machine };
  }

  /**
   * Update a machine
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateMachine(id, data) {
    const existing = await this.machineRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Machine');
    }

    // Check for serial number conflict if updating
    if (data.machineSerialNumber && data.machineSerialNumber !== existing.machineSerialNumber) {
      const conflicting = await this.machineRepo.findBySerialNumber(data.machineSerialNumber);
      if (conflicting) {
        throw new ConflictError('Machine serial number already exists');
      }
    }

    const machine = await this.machineRepo.update(id, data);
    return { machine };
  }

  /**
   * Delete a machine
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async deleteMachine(id) {
    const machine = await this.machineRepo.findById(id);
    if (!machine) {
      throw new NotFoundError('Machine');
    }

    await this.machineRepo.delete(id);
    return { message: 'Machine deleted successfully' };
  }

  /**
   * Decommission a machine
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async decommissionMachine(id) {
    const machine = await this.machineRepo.findById(id);
    if (!machine) {
      throw new NotFoundError('Machine');
    }

    const updated = await this.machineRepo.decommission(id);
    return {
      message: 'Machine decommissioned successfully',
      machine: updated,
    };
  }

  /**
   * Recommission a machine
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async recommissionMachine(id) {
    const machine = await this.machineRepo.findById(id);
    if (!machine) {
      throw new NotFoundError('Machine');
    }

    const updated = await this.machineRepo.recommission(id);
    return {
      message: 'Machine recommissioned successfully',
      machine: updated,
    };
  }
}
