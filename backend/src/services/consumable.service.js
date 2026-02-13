import prisma from '../config/database.js';
import { repositories } from '../repositories/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { calcGeneralPart, calcTonerPart } from '../utils/consumableCalc.js';

/**
 * Consumable Service - Part tracking, yield validation, charge calculation
 */
export class ConsumableService {
  constructor(repos = repositories) {
    this.modelPartRepo = repos.modelPart;
    this.partReplacementRepo = repos.partReplacement;
    this.machineRepo = repos.machine;
    this.readingRepo = repos.reading;
  }

  /**
   * Get current meter reading for a machine (from latest reading)
   */
  async getCurrentMeterReading(machineId, meterType) {
    const readings = await this.readingRepo.findByMachineId(machineId, { take: 1 });
    const latest = readings[0];
    if (!latest) return null;
    let value;
    if (meterType === 'colour') {
      value = latest.colourReading ?? latest.monoReading ?? 0;
    } else if (meterType === 'total') {
      const mono = latest.monoReading ?? 0;
      const colour = latest.colourReading ?? 0;
      value = mono + colour;
    } else {
      value = latest.monoReading ?? 0;
    }
    return value;
  }

  /**
   * Get prior reading for a part on a machine (from last replacement's currentReading)
   */
  async getPriorReading(machineId, modelPartId) {
    const last = await this.partReplacementRepo.findLatestByMachineAndPart(machineId, modelPartId);
    return last ? last.currentReading : 0;
  }

  /**
   * Record a part order/replacement and calculate yield/charges
   */
  async recordPartOrder(data) {
    const {
      machineId,
      modelPartId,
      orderDate,
      currentReading,
      remainingTonerPercent,
    } = data;

    const machine = await this.machineRepo.findById(machineId);
    if (!machine) throw new NotFoundError('Machine');

    const modelPart = await this.modelPartRepo.findById(modelPartId);
    if (!modelPart) throw new NotFoundError('Model part');

    const machineModelId = machine.modelId || machine.model?.id;
    if (!machineModelId || machineModelId !== modelPart.modelId) {
      const modelDisplay = machine.model ? `${machine.model.make?.name || ''} ${machine.model.name || ''}`.trim() : 'unknown';
      throw new ValidationError(`Part "${modelPart.partName}" is not defined for this machine's model (${modelDisplay})`);
    }

    const priorReading = await this.getPriorReading(machineId, modelPartId);
    const usage = Math.max(0, currentReading - priorReading);
    const expectedYield = modelPart.expectedYield;
    const costRand = Number(modelPart.costRand);

    let result;
    if (modelPart.partType === 'toner') {
      const pct = remainingTonerPercent != null ? Number(remainingTonerPercent) : 0;
      result = calcTonerPart(usage, expectedYield, costRand, pct);
    } else {
      result = calcGeneralPart(usage, expectedYield, costRand);
    }

    const replacement = await this.partReplacementRepo.create({
      machineId,
      modelPartId,
      orderDate: new Date(orderDate),
      priorReading,
      currentReading,
      usage,
      remainingTonerPercent: modelPart.partType === 'toner' ? (remainingTonerPercent ?? null) : null,
      yieldMet: result.yieldMet,
      shortfallClicks: result.shortfallClicks,
      adjustedShortfallClicks: result.adjustedShortfallClicks,
      costPerClick: result.costPerClick,
      displayChargeRand: result.displayChargeRand,
      expectedYieldSnapshot: expectedYield,
      costRandSnapshot: costRand,
      branch: machine.branch,
      capturedBy: data.capturedBy,
    });

    const withDetails = await prisma.partReplacement.findUnique({
      where: { id: replacement.id },
      include: { modelPart: true, machine: true },
    });

    return {
      replacement: {
        ...withDetails,
        costPerClick: Number(withDetails.costPerClick),
        displayChargeRand: Number(withDetails.displayChargeRand),
        costRandSnapshot: Number(withDetails.costRandSnapshot),
      },
      calculation: result,
    };
  }

  /**
   * Get consumable history for a machine
   */
  async getMachineConsumableHistory(machineId, branch = null) {
    const machine = await this.machineRepo.findById(machineId);
    if (!machine) throw new NotFoundError('Machine');
    if (branch && machine.branch !== branch) throw new ValidationError('Machine belongs to different branch');

    const replacements = await this.partReplacementRepo.findByMachineIdWithParts(machineId, 100);
    const modelDisplay = machine.model ? `${machine.model.make?.name || ''} ${machine.model.name || ''}`.trim() : null;
    return {
      machine: {
        id: machine.id,
        machineSerialNumber: machine.machineSerialNumber,
        make: machine.model?.make?.name || null,
        model: modelDisplay,
        modelId: machine.modelId,
        customerId: machine.customerId || null,
        customer: machine.customer?.name || null,
      },
      replacements: replacements.map((r) => ({
        id: r.id,
        partName: r.modelPart?.partName,
        partType: r.modelPart?.partType,
        orderDate: r.orderDate,
        priorReading: r.priorReading,
        currentReading: r.currentReading,
        usage: r.usage,
        remainingTonerPercent: r.remainingTonerPercent,
        yieldMet: r.yieldMet,
        shortfallClicks: r.shortfallClicks,
        adjustedShortfallClicks: r.adjustedShortfallClicks,
        costPerClick: Number(r.costPerClick),
        displayChargeRand: Number(r.displayChargeRand),
      })),
    };
  }

  /**
   * Get model parts for a model (for dropdown when ordering)
   * @param {string} modelId - Model UUID
   */
  async getModelParts(modelId, branch = null) {
    if (!modelId) return [];
    return this.modelPartRepo.findByModelId(modelId, branch);
  }

  /**
   * List all model parts (admin)
   */
  async listModelParts(branch = null) {
    const where = { isActive: true };
    if (branch) where.branch = branch;
    return this.modelPartRepo.findMany(where, {
      orderBy: [{ model: { name: 'asc' } }, { partName: 'asc' }],
      include: { model: { include: { make: true } } },
    });
  }

  async getModelPartById(id) {
    const part = await this.modelPartRepo.findById(id);
    if (!part) throw new NotFoundError('Model part');
    return part;
  }

  async createModelPart(data) {
    const branch = data.branch || 'JHB';
    const { modelId, ...rest } = data;
    const part = await this.modelPartRepo.create({ ...rest, modelId, branch });
    return { part };
  }

  async updateModelPart(id, data) {
    const existing = await this.modelPartRepo.findById(id);
    if (!existing) throw new NotFoundError('Model part');
    const part = await this.modelPartRepo.update(id, data);
    return { part };
  }

  async deleteModelPart(id) {
    const existing = await this.modelPartRepo.findById(id);
    if (!existing) throw new NotFoundError('Model part');
    await this.modelPartRepo.delete(id);
    return { message: 'Model part deleted' };
  }

  /**
   * Get summary: all machines with consumable status, filters
   */
  async getConsumableSummary(filters = {}) {
    const { branch, model, partType, complianceStatus } = filters;
    const machines = await this.machineRepo.findManyWithPagination(
      {
        ...(branch && { branch }),
        ...(model && {
          OR: [
            { model: { name: { contains: model, mode: 'insensitive' } } },
            { model: { make: { name: { contains: model, mode: 'insensitive' } } } },
          ],
        }),
        isActive: true,
        isDecommissioned: false,
      },
      { take: 500, include: { model: { include: { make: true } }, customer: true } }
    );

    const machineIds = machines.map((m) => m.id);
    const replacements = machineIds.length
      ? await prisma.partReplacement.findMany({
          where: { machineId: { in: machineIds } },
          orderBy: { orderDate: 'desc' },
          include: { modelPart: true },
        })
      : [];

    // Group by machine, get latest per part
    const byMachine = {};
    for (const r of replacements) {
      const key = `${r.machineId}-${r.modelPartId}`;
      if (!byMachine[key] || new Date(r.orderDate) > new Date(byMachine[key].orderDate)) {
        byMachine[key] = r;
      }
    }

    const rows = [];
    for (const m of machines) {
      const machineReplacements = Object.values(byMachine).filter(
        (r) => r.machineId === m.id && (!partType || r.modelPart?.partType === partType)
      );
      for (const r of machineReplacements) {
        if (complianceStatus === 'met' && !r.yieldMet) continue;
        if (complianceStatus === 'not_met' && r.yieldMet) continue;
        const modelDisplay = m.model ? `${m.model.make?.name || ''} ${m.model.name || ''}`.trim() : null;
        rows.push({
          machineId: m.id,
          machineSerialNumber: m.machineSerialNumber,
          make: m.model?.make?.name || null,
          model: modelDisplay,
          customer: m.customer?.name || null,
          partName: r.modelPart?.partName,
          partType: r.modelPart?.partType,
          lastOrderDate: r.orderDate,
          priorReading: r.priorReading,
          currentReading: r.currentReading,
          usage: r.usage,
          remainingTonerPercent: r.remainingTonerPercent,
          yieldMet: r.yieldMet,
          shortfallClicks: r.shortfallClicks,
          adjustedShortfallClicks: r.adjustedShortfallClicks,
          displayChargeRand: Number(r.displayChargeRand),
        });
      }
    }

    return { machines: machines, rows };
  }

  /**
   * Import past part orders from CSV (admin only).
   * Each row must have machine_serial_number, item_code or part_name, order_date, prior_reading, current_reading.
   * @param {object[]} data - Array of row objects from CSV
   * @param {string} userId - User performing the import
   * @returns {{ succeeded: number, failed: Array<{ row: number, error: string }> }}
   */
  async importPartOrders(data, userId) {
    const results = { succeeded: 0, failed: [] };
    const branch = null;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      try {
        const machine = await this.machineRepo.findBySerialNumber(
          String(row.machine_serial_number || '').trim()
        );
        if (!machine) {
          results.failed.push({ row: rowNum, error: `Machine not found: ${row.machine_serial_number}` });
          continue;
        }

        const modelId = machine.modelId || machine.model?.id;
        if (!modelId) {
          results.failed.push({ row: rowNum, error: `Machine ${row.machine_serial_number} has no model` });
          continue;
        }

        let modelPart = null;
        const itemCode = (row.item_code || '').trim();
        const partName = (row.part_name || '').trim();
        if (itemCode) {
          modelPart = await this.modelPartRepo.findByModelIdAndItemCode(modelId, itemCode, machine.branch);
        }
        if (!modelPart && partName) {
          modelPart = await this.modelPartRepo.findByModelIdAndPartName(modelId, partName, machine.branch);
        }
        if (!modelPart) {
          results.failed.push({
            row: rowNum,
            error: `Part not found for model: ${itemCode || partName || '?'}`,
          });
          continue;
        }

        const priorReading = parseInt(row.prior_reading, 10);
        const currentReading = parseInt(row.current_reading, 10);
        if (isNaN(priorReading) || priorReading < 0) {
          results.failed.push({ row: rowNum, error: 'Invalid prior_reading' });
          continue;
        }
        if (isNaN(currentReading) || currentReading < 0) {
          results.failed.push({ row: rowNum, error: 'Invalid current_reading' });
          continue;
        }
        const usage = Math.max(0, currentReading - priorReading);
        const expectedYield = modelPart.expectedYield;
        const costRand = Number(modelPart.costRand);

        let calcResult;
        if (modelPart.partType === 'toner') {
          const pct = row.toner_percent != null ? Number(row.toner_percent) : 0;
          calcResult = calcTonerPart(usage, expectedYield, costRand, pct);
        } else {
          calcResult = calcGeneralPart(usage, expectedYield, costRand);
        }

        await this.partReplacementRepo.create({
          machineId: machine.id,
          modelPartId: modelPart.id,
          orderDate: new Date(row.order_date),
          priorReading,
          currentReading,
          usage,
          remainingTonerPercent:
            modelPart.partType === 'toner' && row.toner_percent != null ? Number(row.toner_percent) : null,
          yieldMet: calcResult.yieldMet,
          shortfallClicks: calcResult.shortfallClicks,
          adjustedShortfallClicks: calcResult.adjustedShortfallClicks,
          costPerClick: calcResult.costPerClick,
          displayChargeRand: calcResult.displayChargeRand,
          expectedYieldSnapshot: expectedYield,
          costRandSnapshot: costRand,
          branch: machine.branch,
          capturedBy: userId,
        });

        results.succeeded++;
      } catch (err) {
        results.failed.push({
          row: rowNum,
          error: err.message || String(err),
        });
      }
    }

    return results;
  }

  /**
   * Delete a part order/replacement record (admin only)
   */
  async deletePartOrder(id) {
    const existing = await this.partReplacementRepo.findById(id);
    if (!existing) throw new NotFoundError('Part order');
    await this.partReplacementRepo.delete(id);
    return { message: 'Part order deleted' };
  }

  /**
   * Get toner/consumable alerts by customer - parts where usage since last order
   * exceeds expected yield. Uses latest meter reading (monthly capture) vs last
   * toner order's currentReading.
   * @param {string} branch - JHB or CT
   * @returns {Promise<{ customerAlerts: Array }>}
   */
  async getTonerAlertsByCustomer(branch) {
    const branchFilter = branch && ['JHB', 'CT'].includes(branch) ? branch : null;

    const machines = await prisma.machine.findMany({
      where: {
        isActive: true,
        isDecommissioned: false,
        customerId: { not: null },
        modelId: { not: null },
        ...(branchFilter && { branch: branchFilter }),
      },
      include: {
        customer: true,
        model: {
          include: {
            modelParts: { where: { isActive: true } },
          },
        },
      },
    });

    const customerAlertsMap = new Map();

    for (const machine of machines) {
      if (!machine.customer || !machine.model?.modelParts?.length) continue;

      const customerId = machine.customer.id;
      const customerName = machine.customer.name;

      if (!customerAlertsMap.has(customerId)) {
        customerAlertsMap.set(customerId, {
          customerId,
          customerName,
          alertCount: 0,
          partsDue: [],
        });
      }

      const latestReading = (await this.readingRepo.findByMachineId(machine.id, { take: 1 }))[0];
      if (!latestReading) continue;

      const relevantParts = machine.model.modelParts.filter(
        (p) => !branchFilter || p.branch === machine.branch
      );

      for (const part of relevantParts) {
        const lastReplacement = await this.partReplacementRepo.findLatestByMachineAndPart(machine.id, part.id);
        if (!lastReplacement) continue;

        const priorReading = lastReplacement.currentReading;
        const currentReading = this._getMeterValue(latestReading, part.meterType);
        if (currentReading == null) continue;

        const usage = Math.max(0, currentReading - priorReading);
        const expectedYield = part.expectedYield;
        if (expectedYield <= 0) continue;

        if (usage >= expectedYield) {
          const entry = customerAlertsMap.get(customerId);
          entry.alertCount += 1;
          entry.partsDue.push({
            machineId: machine.id,
            partName: part.partName,
            machineSerialNumber: machine.machineSerialNumber,
            usage,
            expectedYield,
            percentUsed: Math.round((usage / expectedYield) * 100),
            partType: part.partType,
            tonerColor: part.tonerColor,
          });
        }
      }
    }

    const customerAlerts = Array.from(customerAlertsMap.values()).filter((c) => c.alertCount > 0);
    return { customerAlerts };
  }

  _getMeterValue(reading, meterType) {
    const mono = reading.monoReading ?? 0;
    const colour = reading.colourReading ?? 0;
    if (meterType === 'colour') return colour > 0 ? colour : mono;
    if (meterType === 'total') return mono + colour;
    return mono;
  }
}
