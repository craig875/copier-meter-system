import { repositories } from '../repositories/index.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

/**
 * Compute life status from machine (with model.machineLife) and latest reading.
 * @param {object} machine - Machine with model
 * @param {object|null} reading - Latest reading
 * @returns {{ totalReading: number, lifePercentUsed: number|null, nearEndOfLife: boolean }}
 */
function computeLifeStatus(machine, reading) {
  const machineLife = machine?.model?.machineLife;
  const mono = reading?.monoReading ?? 0;
  const colour = reading?.colourReading ?? 0;
  const totalReading = mono + colour;

  if (!machineLife || machineLife <= 0) {
    return { totalReading, lifePercentUsed: null, nearEndOfLife: false };
  }

  const lifePercentUsed = Math.round((totalReading / machineLife) * 100);
  const nearEndOfLife = lifePercentUsed >= 80;
  return { totalReading, lifePercentUsed, nearEndOfLife };
}

/**
 * Machine Service - Business logic for machines
 * Single Responsibility: Business logic for machine operations
 */
export class MachineService {
  constructor(repos = repositories) {
    this.machineRepo = repos.machine;
    this.readingRepo = repos.reading;
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

    // Enrich with life status (totalReading, lifePercentUsed, nearEndOfLife)
    if (machines.length > 0) {
      const latestByMachine = await this.readingRepo.findLatestByMachineIds(machines.map((m) => m.id));
      for (const m of machines) {
        const reading = latestByMachine.get(m.id) || null;
        const life = computeLifeStatus(m, reading);
        m.totalReading = life.totalReading;
        m.lifePercentUsed = life.lifePercentUsed;
        m.nearEndOfLife = life.nearEndOfLife;
      }
    }

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
    const [latestReading] = await this.readingRepo.findByMachineId(id, { take: 1 });
    const life = computeLifeStatus(machine, latestReading || null);
    machine.totalReading = life.totalReading;
    machine.lifePercentUsed = life.lifePercentUsed;
    machine.nearEndOfLife = life.nearEndOfLife;
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
