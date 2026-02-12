import { BaseRepository } from './base.repository.js';

/**
 * Reading Repository - Handles all data access operations for readings
 * Single Responsibility: Data access for Reading entities
 */
export class ReadingRepository extends BaseRepository {
  constructor(prisma) {
    super('reading', prisma);
  }

  async findByYearMonth(year, month, branch) {
    const where = {
      year: parseInt(year),
      month: parseInt(month),
    };
    // Only filter by branch if it's provided (null means show all)
    if (branch) {
      where.branch = branch;
    }
    return this.findMany(where);
  }

  async findByMachineIdAndYearMonth(machineId, year, month) {
    return this.findOne({
      machineId,
      year: parseInt(year),
      month: parseInt(month),
    });
  }

  async findByMachineIdsAndYearMonth(machineIds, year, month) {
    return this.findMany({
      machineId: { in: machineIds },
      year: parseInt(year),
      month: parseInt(month),
    });
  }

  async findByMachineId(machineId, options = {}) {
    return this.findMany(
      { machineId },
      {
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        ...options,
      }
    );
  }

  async deleteByMachineIdAndYearMonth(machineId, year, month) {
    // Find the reading first to get its id, then delete
    const reading = await this.findOne({
      machineId,
      year: parseInt(year),
      month: parseInt(month),
    });
    
    if (!reading) {
      return null;
    }
    
    // Delete by id
    return this.delete(reading.id);
  }

  async upsertReading(data) {
    // Convert undefined to null for Prisma compatibility
    const cleanData = {
      ...data,
      monoReading: data.monoReading ?? null,
      colourReading: data.colourReading ?? null,
      scanReading: data.scanReading ?? null,
      note: data.note || null,
      monoUsage: data.monoUsage ?? null,
      colourUsage: data.colourUsage ?? null,
      scanUsage: data.scanUsage ?? null,
    };

    // Prepare create data (includes all fields)
    const createData = {
      machineId: cleanData.machineId,
      year: cleanData.year,
      month: cleanData.month,
      monoReading: cleanData.monoReading,
      colourReading: cleanData.colourReading,
      scanReading: cleanData.scanReading,
      note: cleanData.note,
      monoUsage: cleanData.monoUsage,
      colourUsage: cleanData.colourUsage,
      scanUsage: cleanData.scanUsage,
      capturedBy: cleanData.capturedBy,
      branch: cleanData.branch,
    };

    // Prepare update data (only updatable fields - don't update capturedBy or branch)
    const updateData = {
      monoReading: cleanData.monoReading,
      colourReading: cleanData.colourReading,
      scanReading: cleanData.scanReading,
      note: cleanData.note,
      monoUsage: cleanData.monoUsage,
      colourUsage: cleanData.colourUsage,
      scanUsage: cleanData.scanUsage,
    };

    return this.upsert(
      {
        machineId_year_month: {
          machineId: cleanData.machineId,
          year: cleanData.year,
          month: cleanData.month,
        },
      },
      createData,
      updateData
    );
  }
}
