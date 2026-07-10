import prisma from '../config/database.js';
import { repositories } from '../repositories/index.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import { assertRecordInTenant } from '../middleware/tenant.js';

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

  buildListWhere(branch, archived = false) {
    return {
      isArchived: archived,
      branch,
    };
  }

  async getCustomers(branch, archived = false) {
    const where = this.buildListWhere(branch, archived === true || archived === 'true');
    const customers = await this.customerRepo.findManyWithMachines(where);
    return { customers };
  }

  async getCustomer(id, tenantBranch) {
    const existing = await this.customerRepo.findById(id);
    assertRecordInTenant(existing, tenantBranch, 'Customer');

    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { machines: { include: { model: { include: { make: true } } } } },
    });
    assertRecordInTenant(customer, tenantBranch, 'Customer');

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

  async updateCustomer(id, data, tenantBranch) {
    const existing = await this.customerRepo.findById(id);
    assertRecordInTenant(existing, tenantBranch, 'Customer');
    const customer = await this.customerRepo.update(id, data);
    return { customer };
  }

  async deleteCustomer(id, tenantBranch) {
    const existing = await this.customerRepo.findById(id);
    assertRecordInTenant(existing, tenantBranch, 'Customer');
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

  async archiveCustomer(id, isArchived, tenantBranch) {
    const existing = await this.customerRepo.findById(id);
    assertRecordInTenant(existing, tenantBranch, 'Customer');

    if (isArchived) {
      const activeMachines = await this.prisma.machine.findMany({
        where: {
          customerId: id,
          isDecommissioned: false,
        },
        select: {
          id: true,
          machineSerialNumber: true,
        },
        orderBy: { machineSerialNumber: 'asc' },
      });

      if (activeMachines.length > 0) {
        throw new ValidationError(
          `Cannot archive customer: ${activeMachines.length} machine(s) must be decommissioned first.`,
          activeMachines.map((m) => ({
            field: 'machine',
            message: m.machineSerialNumber,
            machineId: m.id,
            machineSerialNumber: m.machineSerialNumber,
          }))
        );
      }
    }

    const customer = await this.customerRepo.update(id, { isArchived: !!isArchived });
    return { customer };
  }
}
