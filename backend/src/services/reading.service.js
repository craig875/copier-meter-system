import { repositories } from '../repositories/index.js';
import { validateReadings } from './validation.service.js';
import { generateExcelExport, generateExcelExportSplitByBranch } from './export.service.js';
import { getPreviousMonth } from '../utils/date.utils.js';
import { calculateReadingMetrics } from '../utils/reading.utils.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

/**
 * Reading Service - Business logic for meter readings
 * Single Responsibility: Business logic for reading operations
 * Dependency Injection: Uses repositories for data access
 */
export class ReadingService {
  constructor(repos = repositories) {
    this.readingRepo = repos.reading;
    this.machineRepo = repos.machine;
    this.submissionRepo = repos.submission;
  }

  /**
   * Get readings for a specific year and month
   * @param {number} year
   * @param {number} month
   * @param {boolean} includeDecommissioned
   * @returns {Promise<Object>}
   */
  async getReadings(year, month, branch, includeDecommissioned = false) {
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);
    const prev = getPreviousMonth(targetYear, targetMonth);

    // Build where clause - only include branch if it's not null
    const machineWhere = {};
    if (branch) {
      machineWhere.branch = branch;
    }

    // Get machines
    const machines = includeDecommissioned
      ? await this.machineRepo.findMany(machineWhere, { 
          orderBy: [
            { customer: 'asc' },
            { machineSerialNumber: 'asc' },
          ],
        })
      : await this.machineRepo.findActive(branch, false);

    // Get readings - repository methods now handle null branch
    const [currentReadings, previousReadings, submission] = await Promise.all([
      this.readingRepo.findByYearMonth(targetYear, targetMonth, branch),
      this.readingRepo.findByYearMonth(prev.year, prev.month, branch),
      branch ? this.submissionRepo.findByYearMonth(targetYear, targetMonth, branch) : null,
    ]);

    // Create lookup maps
    const currentReadingMap = new Map(currentReadings.map(r => [r.machineId, r]));
    const previousReadingMap = new Map(previousReadings.map(r => [r.machineId, r]));

    // Get list of machine IDs for filtering readings
    const machineIds = new Set(machines.map(m => m.id));

    // Combine data and filter readings to only include those for machines in the filtered list
    const data = machines.map(machine => ({
      machine,
      currentReading: currentReadingMap.get(machine.id) || null,
      previousReading: previousReadingMap.get(machine.id) || null,
    }));

    // Count only readings that belong to machines in the filtered list
    // AND have actual reading values (not just notes)
    // This ensures capturedCount matches machines with actual readings
    // A reading with only a note should still show as "pending"
    const validReadings = currentReadings.filter(r => {
      if (!machineIds.has(r.machineId)) return false;
      // Only count as "captured" if there's at least one reading value
      return r.monoReading != null || r.colourReading != null || r.scanReading != null;
    });
    const capturedCount = validReadings.length;
    
    console.log('Reading Service - getReadings summary:', {
      branch,
      totalMachines: machines.length,
      totalReadingsFromQuery: currentReadings.length,
      validReadingsCount: capturedCount,
      machineIdsCount: machineIds.size
    });

    return {
      year: targetYear,
      month: targetMonth,
      branch,
      data,
      isLocked: !!submission,
      submission: submission ? {
        submittedAt: submission.submittedAt,
        submittedBy: submission.submittedBy,
      } : null,
      summary: {
        totalMachines: machines.length,
        capturedCount: capturedCount,
        pendingCount: machines.length - capturedCount,
      },
    };
  }

  /**
   * Submit readings for a specific year and month
   * @param {number} year
   * @param {number} month
   * @param {string} branch
   * @param {Array} readings
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async submitReadings(year, month, branch, readings, userId) {
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    // Check if month is locked
    const submission = await this.submissionRepo.findByYearMonth(targetYear, targetMonth, branch);
    if (submission) {
      throw new ForbiddenError('This month has been submitted and is locked for editing');
    }

    // Get machines
    const machineIds = readings.map(r => r.machineId);
    const machines = await this.machineRepo.findByIds(machineIds);
    const machineMap = new Map(machines.map(m => [m.id, m]));

    // Validate all machines exist
    const missingMachines = machineIds.filter(id => !machineMap.has(id));
    if (missingMachines.length > 0) {
      throw new NotFoundError(`Machines with IDs: ${missingMachines.join(', ')}`);
    }

    // Validate all machines belong to the specified branch
    const invalidBranchMachines = machines.filter(m => m.branch !== branch);
    if (invalidBranchMachines.length > 0) {
      const serialNumbers = invalidBranchMachines.map(m => m.machineSerialNumber).join(', ');
      throw new ValidationError(
        `Machines do not belong to branch ${branch}: ${serialNumbers}`
      );
    }

    // Get previous month readings
    const prev = getPreviousMonth(targetYear, targetMonth);
    const previousReadings = await this.readingRepo.findByMachineIdsAndYearMonth(
      machineIds,
      prev.year,
      prev.month
    );
    const previousReadingMap = new Map(previousReadings.map(r => [r.machineId, r]));

    // Validate readings
    const validation = validateReadings(readings, machineMap, previousReadingMap);
    if (!validation.valid) {
      throw new ValidationError('Validation failed', validation.errors);
    }

    // Prepare readings with calculated metrics
    const readingsToSave = readings.map(reading => {
      const machine = machineMap.get(reading.machineId);
      const prevReading = previousReadingMap.get(reading.machineId);

      // Only calculate metrics if there are actual reading values
      // If only a note is provided, usage should be null
      const hasReadingValues = reading.monoReading != null || 
                               reading.colourReading != null || 
                               reading.scanReading != null;
      
      const metrics = hasReadingValues 
        ? calculateReadingMetrics(reading, prevReading)
        : { monoUsage: null, colourUsage: null, scanUsage: null };

      // Convert undefined to null for Prisma compatibility
      const cleanReading = {
        machineId: reading.machineId,
        year: targetYear,
        month: targetMonth,
        monoReading: reading.monoReading ?? null,
        colourReading: reading.colourReading ?? null,
        scanReading: reading.scanReading ?? null,
        note: reading.note && reading.note.trim().length > 0 ? reading.note.trim() : null,
        monoUsage: metrics.monoUsage ?? null,
        colourUsage: metrics.colourUsage ?? null,
        scanUsage: metrics.scanUsage ?? null,
        capturedBy: userId,
        branch,
      };

      return cleanReading;
    });

    // Save readings
    const results = await Promise.all(
      readingsToSave.map(data => this.readingRepo.upsertReading(data))
    );

    return {
      message: 'Readings saved successfully',
      savedCount: results.length,
    };
  }

  /**
   * Export readings to Excel and lock the month
   * @param {number} year
   * @param {number} month
   * @param {string} branch
   * @param {string} userId
   * @returns {Promise<Buffer>}
   */
  async exportReadings(year, month, branch, userId) {
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    // Get machines and readings
    // Use findActive to exclude decommissioned machines - matches the collection screen
    const [machines, currentReadings] = await Promise.all([
      this.machineRepo.findActive(branch, false),
      this.readingRepo.findByYearMonth(targetYear, targetMonth, branch),
    ]);

    const currentReadingMap = new Map(currentReadings.map(r => [r.machineId, r]));

    // Generate Excel
    const buffer = await generateExcelExport(
      machines,
      currentReadingMap,
      targetYear,
      targetMonth
    );

    // Mark month as submitted (non-blocking)
    // Only create submission if branch is provided (submissions are branch-specific)
    if (branch) {
      try {
        await this.submissionRepo.createOrUpdate(targetYear, targetMonth, branch, userId);
      } catch (error) {
        console.error('Failed to create submission record (non-critical):', error);
        // Continue with export - submission record is optional
      }
    }

    return buffer;
  }

  /**
   * Get reading history for a machine
   * @param {string} machineId
   * @param {number} limit
   * @param {string} branch - Optional branch filter
   * @returns {Promise<Array>}
   */
  async getReadingHistory(machineId, limit = 12, branch = null) {
    const options = {
      take: parseInt(limit),
      include: {
        user: {
          select: { name: true },
        },
      },
    };

    // If branch filter is provided, use findMany with where clause
    if (branch) {
      const readings = await this.readingRepo.findMany(
        { machineId, branch },
        options
      );
      return { readings };
    }

    // Otherwise use the existing findByMachineId method
    const readings = await this.readingRepo.findByMachineId(machineId, options);
    return { readings };
  }

  /**
   * Get readings split by branch for a specific year and month
   * @param {number} year
   * @param {number} month
   * @param {boolean} includeDecommissioned
   * @returns {Promise<Object>}
   */
  async getReadingsSplitByBranch(year, month, includeDecommissioned = false) {
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);
    const prev = getPreviousMonth(targetYear, targetMonth);

    // Get readings for all branches
    const branches = ['JHB', 'CT'];
    const branchData = {};

    for (const branch of branches) {
      // Get machines
      const machines = includeDecommissioned
        ? await this.machineRepo.findMany({ branch }, { 
            orderBy: [
              { customer: 'asc' },
              { machineSerialNumber: 'asc' },
            ],
          })
        : await this.machineRepo.findActive(branch, false);

      // Get readings
      const [currentReadings, previousReadings, submission] = await Promise.all([
        this.readingRepo.findByYearMonth(targetYear, targetMonth, branch),
        this.readingRepo.findByYearMonth(prev.year, prev.month, branch),
        this.submissionRepo.findByYearMonth(targetYear, targetMonth, branch),
      ]);

      // Create lookup maps
      const currentReadingMap = new Map(currentReadings.map(r => [r.machineId, r]));
      const previousReadingMap = new Map(previousReadings.map(r => [r.machineId, r]));

      // Combine data
      const data = machines.map(machine => ({
        machine,
        currentReading: currentReadingMap.get(machine.id) || null,
        previousReading: previousReadingMap.get(machine.id) || null,
      }));

      branchData[branch] = {
        branch,
        data,
        isLocked: !!submission,
        submission: submission ? {
          submittedAt: submission.submittedAt,
          submittedBy: submission.submittedBy,
        } : null,
        summary: {
          totalMachines: machines.length,
          capturedCount: currentReadings.length,
          pendingCount: machines.length - currentReadings.length,
        },
      };
    }

    return {
      year: targetYear,
      month: targetMonth,
      branches: branchData,
    };
  }

  /**
   * Export readings split by branch to Excel
   * @param {number} year
   * @param {number} month
   * @param {string} userId
   * @returns {Promise<Buffer>}
   */
  async exportReadingsSplitByBranch(year, month, userId) {
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    // Get data for all branches
    const branches = ['JHB', 'CT'];
    const branchData = {};

    for (const branch of branches) {
      const [machines, currentReadings] = await Promise.all([
        this.machineRepo.findActive(branch, false),
        this.readingRepo.findByYearMonth(targetYear, targetMonth, branch),
      ]);

      const currentReadingMap = new Map(currentReadings.map(r => [r.machineId, r]));
      branchData[branch] = {
        machines,
        currentReadingMap,
      };
    }

    // Generate Excel with separate worksheets for each branch
    const buffer = await generateExcelExportSplitByBranch(
      branchData,
      targetYear,
      targetMonth
    );

    // Mark months as submitted for all branches (non-blocking)
    for (const branch of branches) {
      try {
        await this.submissionRepo.createOrUpdate(targetYear, targetMonth, branch, userId);
      } catch (error) {
        console.error(`Failed to create submission record for ${branch} (non-critical):`, error);
      }
    }

    return buffer;
  }

  /**
   * Unlock a submitted month for editing (admin only) - removes the submission record
   * @param {number} year
   * @param {number} month
   * @param {string} branch
   * @returns {Promise<Object>}
   */
  async unlockMonth(year, month, branch) {
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    if (!branch) {
      throw new ValidationError('Branch is required to unlock');
    }

    const count = await this.submissionRepo.deleteByYearMonth(targetYear, targetMonth, branch);

    return {
      message: count > 0 ? 'Month unlocked successfully' : 'Month was not locked',
      year: targetYear,
      month: targetMonth,
      branch,
    };
  }

  /**
   * Delete a reading for a specific machine, year, and month (admin only)
   * @param {string} machineId
   * @param {number} year
   * @param {number} month
   * @returns {Promise<Object>}
   */
  async deleteReading(machineId, year, month) {
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    // Check if reading exists
    const reading = await this.readingRepo.findByMachineIdAndYearMonth(machineId, targetYear, targetMonth);
    if (!reading) {
      throw new NotFoundError('Reading not found');
    }

    // Delete the reading
    await this.readingRepo.deleteByMachineIdAndYearMonth(machineId, targetYear, targetMonth);

    return {
      message: 'Reading deleted successfully',
      machineId,
      year: targetYear,
      month: targetMonth,
    };
  }
}
