import prisma from '../config/database.js';
import { repositories } from '../repositories/index.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

/**
 * Compute life status from machine (with model.machineLife) and latest reading.
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
 * Customer Service - Business logic for customers
 */
export class CustomerService {
  constructor(repos = repositories) {
    this.customerRepo = repos.customer;
    this.readingRepo = repos.reading;
    this.prisma = prisma;
  }

  async getCustomers(branch = null) {
    const where = {};
    if (branch && ['JHB', 'CT'].includes(branch)) {
      where.OR = [{ branch }, { branch: null }];
    }
    const customers = await this.customerRepo.findManyWithMachines(where);
    return { customers };
  }

  async getCustomer(id) {
    const existing = await this.customerRepo.findById(id);
    if (!existing) throw new NotFoundError('Customer');
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { machines: { include: { model: { include: { make: true } } } } },
    });
    if (customer?.machines?.length > 0) {
      const latestByMachine = await this.readingRepo.findLatestByMachineIds(customer.machines.map((m) => m.id));
      for (const m of customer.machines) {
        const reading = latestByMachine.get(m.id) || null;
        const life = computeLifeStatus(m, reading);
        m.totalReading = life.totalReading;
        m.lifePercentUsed = life.lifePercentUsed;
        m.nearEndOfLife = life.nearEndOfLife;
      }
    }
    return { customer };
  }

  async createCustomer(data) {
    const customer = await this.customerRepo.create(data);
    return { customer };
  }

  async updateCustomer(id, data) {
    const existing = await this.customerRepo.findById(id);
    if (!existing) throw new NotFoundError('Customer');
    const customer = await this.customerRepo.update(id, data);
    return { customer };
  }

  async deleteCustomer(id) {
    const existing = await this.customerRepo.findById(id);
    if (!existing) throw new NotFoundError('Customer');
    const withCount = await this.prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { machines: true } } },
    });
    if (withCount?._count?.machines > 0) {
      throw new ConflictError(`Cannot delete: ${withCount._count.machines} machine(s) are linked. Unlink them first.`);
    }
    await this.customerRepo.delete(id);
    return { message: 'Customer deleted' };
  }

  async archiveCustomer(id, isArchived) {
    const existing = await this.customerRepo.findById(id);
    if (!existing) throw new NotFoundError('Customer');
    const customer = await this.customerRepo.update(id, { isArchived: !!isArchived });
    return { customer };
  }
}
