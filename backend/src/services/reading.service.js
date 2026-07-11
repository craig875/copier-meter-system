import { repositories } from '../repositories/index.js';
import { validateReadings } from './validation.service.js';
import { generateExcelExport, generateTextExport, generateExcelExportSplitByBranch } from './export.service.js';
import { getPreviousMonth } from '../utils/date.utils.js';
import { calculateReadingMetrics } from '../utils/reading.utils.js';
import { resolveUnchangedReason } from '../utils/reading-unchanged.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { assertRecordInTenant } from '../middleware/tenant.js';
import {
  isConsecutiveUnableToReadBlocked,
  CONSECUTIVE_UNABLE_TO_READ_MESSAGE,
} from '../utils/reading-completeness.js';
import prisma from '../config/database.js';

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
    this.unableToObtainOverrideRequestRepo = repos.unableToObtainOverrideRequest;
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
            { customer: { name: 'asc' } },
            { machineSerialNumber: 'asc' },
          ],
          include: { model: { include: { make: true } }, customer: true },
        })
      : await this.machineRepo.findActive(branch, false);

    // Get readings - repository methods now handle null branch
    const [currentReadings, previousReadings, submission, pendingOverrideRequests] = await Promise.all([
      this.readingRepo.findByYearMonth(targetYear, targetMonth, branch),
      this.readingRepo.findByYearMonth(prev.year, prev.month, branch),
      branch ? this.submissionRepo.findByYearMonth(targetYear, targetMonth, branch) : null,
      this.unableToObtainOverrideRequestRepo
        ? this.unableToObtainOverrideRequestRepo.findPendingByYearMonthBranch(targetYear, targetMonth, branch)
        : Promise.resolve([]),
    ]);

    // Create lookup maps
    const currentReadingMap = new Map(currentReadings.map(r => [r.machineId, r]));
    const previousReadingMap = new Map(previousReadings.map(r => [r.machineId, r]));
    const pendingOverrideMap = new Map(
      (pendingOverrideRequests || []).map((r) => [r.machineId, r]),
    );

    // Get list of machine IDs for filtering readings
    const machineIds = new Set(machines.map(m => m.id));

    // Combine data and filter readings to only include those for machines in the filtered list
    const data = machines.map(machine => {
      const pending = pendingOverrideMap.get(machine.id) || null;
      return {
        machine,
        currentReading: currentReadingMap.get(machine.id) || null,
        previousReading: previousReadingMap.get(machine.id) || null,
        pendingUnableToObtainOverrideRequest: pending
          ? {
              id: pending.id,
              note: pending.note,
              createdAt: pending.createdAt,
              requestedBy: pending.requestedBy || null,
            }
          : null,
      };
    });

    // Count only readings that belong to machines in the filtered list
    // AND have actual reading values (not just notes)
    // This ensures capturedCount matches machines with actual readings
    // A reading with only a note should still show as "pending"
    const validReadings = currentReadings.filter(r => {
      if (!machineIds.has(r.machineId)) return false;
      // Only count as "captured" if there's at least one reading value
      return r.monoReading != null || r.colourReading != null || r.scanReading != null || r.unableToRead;
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

    // Filter to only machines belonging to the specified branch (handles stale data / branch switch)
    const branchStr = String(branch).toUpperCase();
    const validMachines = machines.filter(m => String(m.branch).toUpperCase() === branchStr);
    const skippedMachines = machines.filter(m => String(m.branch).toUpperCase() !== branchStr);
    const validMachineIds = new Set(validMachines.map(m => m.id));
    const readingsToProcess = readings.filter(r => validMachineIds.has(r.machineId));

    if (readingsToProcess.length === 0) {
      const serialNumbers = skippedMachines.map(m => m.machineSerialNumber).join(', ');
      throw new ValidationError(
        `No machines belong to branch ${branch}. Check branch selection. Skipped: ${serialNumbers || 'none'}`
      );
    }

    if (skippedMachines.length > 0) {
      console.warn(`SubmitReadings: Skipped ${skippedMachines.length} machines not in branch ${branch}:`, skippedMachines.map(m => m.machineSerialNumber));
    }

    // Get previous month readings
    const prev = getPreviousMonth(targetYear, targetMonth);
    const previousReadings = await this.readingRepo.findByMachineIdsAndYearMonth(
      readingsToProcess.map(r => r.machineId),
      prev.year,
      prev.month
    );
    const previousReadingMap = new Map(previousReadings.map(r => [r.machineId, r]));

    // Normal capture path cannot create consecutive Unable-to-obtain readings
    const consecutiveBlocked = readingsToProcess.filter(
      (r) => r.unableToRead === true
        && isConsecutiveUnableToReadBlocked(previousReadingMap.get(r.machineId)),
    );
    if (consecutiveBlocked.length > 0) {
      const serials = consecutiveBlocked
        .map((r) => machineMap.get(r.machineId)?.machineSerialNumber || r.machineId)
        .join(', ');
      throw new ValidationError(
        `${CONSECUTIVE_UNABLE_TO_READ_MESSAGE} Blocked: ${serials}`,
      );
    }

    // Validate readings (only for machines we're processing)
    const validation = validateReadings(readingsToProcess, machineMap, previousReadingMap);
    if (!validation.valid) {
      throw new ValidationError('Validation failed', validation.errors);
    }

    // Prepare readings with calculated metrics
    const readingsToSave = readingsToProcess.map(reading => {
      const machine = machineMap.get(reading.machineId);
      const prevReading = previousReadingMap.get(reading.machineId);

      // Only calculate metrics if there are actual reading values
      // If only a note is provided, usage should be null
      const hasReadingValues = reading.monoReading != null || 
                               reading.colourReading != null || 
                               reading.scanReading != null;
      
      const metrics = (hasReadingValues && !reading.unableToRead)
        ? calculateReadingMetrics(reading, prevReading)
        : { monoUsage: null, colourUsage: null, scanUsage: null };

      const unableToRead = reading.unableToRead === true;
      const unableToReadReason = unableToRead && reading.unableToReadReason?.trim()
        ? reading.unableToReadReason.trim()
        : null;

      // Convert undefined to null for Prisma compatibility
      const cleanReading = {
        machineId: reading.machineId,
        year: targetYear,
        month: targetMonth,
        monoReading: unableToRead ? null : (reading.monoReading ?? null),
        colourReading: unableToRead ? null : (reading.colourReading ?? null),
        scanReading: unableToRead ? null : (reading.scanReading ?? null),
        note: unableToRead ? null : (reading.note && reading.note.trim().length > 0 ? reading.note.trim() : null),
        unableToRead,
        unableToReadReason,
        // Capture path never sets override flags
        unableToReadOverride: false,
        unableToReadOverrideReason: null,
        unableToReadOverrideBy: null,
        unableToReadOverrideAt: null,
        monoUnchangedReason: unableToRead ? null : resolveUnchangedReason(
          reading.monoReading,
          prevReading?.monoReading,
          reading.monoUnchangedReason
        ),
        colourUnchangedReason: unableToRead ? null : resolveUnchangedReason(
          reading.colourReading,
          prevReading?.colourReading,
          reading.colourUnchangedReason
        ),
        scanUnchangedReason: unableToRead ? null : resolveUnchangedReason(
          reading.scanReading,
          prevReading?.scanReading,
          reading.scanUnchangedReason
        ),
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

    const response = {
      message: 'Readings saved successfully',
      savedCount: results.length,
    };
    if (skippedMachines.length > 0) {
      response.skippedCount = skippedMachines.length;
      response.skippedSerialNumbers = skippedMachines.map(m => m.machineSerialNumber);
    }
    return response;
  }

  /**
   * Derived list of machines blocked from Unable-to-obtain because the previous
   * month was also Unable-to-obtain, and no current reading exists yet.
   * Also returns pending manager override requests for the period.
   */
  async listUnableToObtainBlocked(year, month, branch) {
    const targetYear = parseInt(year, 10);
    const targetMonth = parseInt(month, 10);
    const prev = getPreviousMonth(targetYear, targetMonth);

    const [machines, currentReadings, previousReadings, submission, pendingRequests] = await Promise.all([
      this.machineRepo.findActive(branch, false),
      this.readingRepo.findByYearMonth(targetYear, targetMonth, branch),
      this.readingRepo.findByYearMonth(prev.year, prev.month, branch),
      branch ? this.submissionRepo.findByYearMonth(targetYear, targetMonth, branch) : null,
      this.unableToObtainOverrideRequestRepo.findPendingByYearMonthBranch(
        targetYear,
        targetMonth,
        branch,
      ),
    ]);

    const currentReadingMap = new Map(currentReadings.map((r) => [r.machineId, r]));
    const previousReadingMap = new Map(previousReadings.map((r) => [r.machineId, r]));
    const pendingByMachine = new Map(pendingRequests.map((r) => [r.machineId, r]));

    const blocked = machines
      .filter((machine) => {
        if (currentReadingMap.has(machine.id)) return false;
        return isConsecutiveUnableToReadBlocked(previousReadingMap.get(machine.id));
      })
      .map((machine) => {
        const previousReading = previousReadingMap.get(machine.id);
        const pending = pendingByMachine.get(machine.id) || null;
        return {
          machine: {
            id: machine.id,
            machineSerialNumber: machine.machineSerialNumber,
            customer: machine.customer
              ? { id: machine.customer.id, name: machine.customer.name }
              : null,
            model: machine.model || null,
          },
          previousReading: {
            year: previousReading.year,
            month: previousReading.month,
            unableToRead: previousReading.unableToRead,
            unableToReadReason: previousReading.unableToReadReason,
            unableToReadOverride: previousReading.unableToReadOverride === true,
          },
          pendingRequest: pending
            ? {
                id: pending.id,
                note: pending.note,
                createdAt: pending.createdAt,
                requestedBy: pending.requestedBy || null,
              }
            : null,
        };
      });

    const pending = pendingRequests.map((req) => ({
      id: req.id,
      note: req.note,
      createdAt: req.createdAt,
      machine: {
        id: req.machine.id,
        machineSerialNumber: req.machine.machineSerialNumber,
        customer: req.machine.customer
          ? { id: req.machine.customer.id, name: req.machine.customer.name }
          : null,
      },
      requestedBy: req.requestedBy || null,
      previousUnableToReadReason: previousReadingMap.get(req.machineId)?.unableToReadReason || null,
      isStillBlocked:
        !currentReadingMap.has(req.machineId)
        && isConsecutiveUnableToReadBlocked(previousReadingMap.get(req.machineId)),
    }));

    return {
      year: targetYear,
      month: targetMonth,
      branch,
      isLocked: !!submission,
      blocked,
      pendingRequests: pending,
      summary: {
        blockedCount: blocked.length,
        pendingRequestCount: pending.length,
      },
    };
  }

  /**
   * Manager requests admin force-approve for consecutive Unable-to-obtain.
   */
  async requestUnableToObtainOverride(year, month, branch, machineId, note, userId) {
    const targetYear = parseInt(year, 10);
    const targetMonth = parseInt(month, 10);

    const submission = await this.submissionRepo.findByYearMonth(targetYear, targetMonth, branch);
    if (submission) {
      throw new ForbiddenError('This month has been submitted and is locked for editing');
    }

    const machine = await this.machineRepo.findById(machineId);
    if (!machine) {
      throw new NotFoundError('Machine not found');
    }
    assertRecordInTenant(machine, branch, 'Machine');

    const existing = await this.readingRepo.findByMachineIdAndYearMonth(
      machineId,
      targetYear,
      targetMonth,
    );
    if (existing) {
      throw new ValidationError('This machine already has a reading for the selected month');
    }

    const prev = getPreviousMonth(targetYear, targetMonth);
    const previousReading = await this.readingRepo.findByMachineIdAndYearMonth(
      machineId,
      prev.year,
      prev.month,
    );
    if (!isConsecutiveUnableToReadBlocked(previousReading)) {
      throw new ValidationError(
        'A request is only allowed when the previous month was also Unable to obtain',
      );
    }

    const alreadyPending = await this.unableToObtainOverrideRequestRepo.findPendingByMachinePeriod(
      machineId,
      targetYear,
      targetMonth,
    );
    if (alreadyPending) {
      throw new ValidationError('An override has already been requested for this machine and period');
    }

    const trimmedNote = typeof note === 'string' && note.trim() ? note.trim() : null;

    try {
      const request = await this.unableToObtainOverrideRequestRepo.create({
        machineId,
        year: targetYear,
        month: targetMonth,
        branch,
        requestedById: userId,
        note: trimmedNote,
      });
      return {
        request,
        machine: request.machine,
        previousUnableToReadReason: previousReading.unableToReadReason,
      };
    } catch (err) {
      if (err?.code === 'P2002') {
        throw new ValidationError('An override has already been requested for this machine and period');
      }
      throw err;
    }
  }

  /**
   * Admin force-approve: directly write Unable-to-obtain for a consecutive month.
   * Resolves any pending manager request in the same transaction.
   */
  async forceUnableToObtainOverride(year, month, branch, machineId, reason, userId) {
    const targetYear = parseInt(year, 10);
    const targetMonth = parseInt(month, 10);
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmedReason) {
      throw new ValidationError('Override reason is required');
    }

    const submission = await this.submissionRepo.findByYearMonth(targetYear, targetMonth, branch);
    if (submission) {
      throw new ForbiddenError('This month has been submitted and is locked for editing');
    }

    const machine = await this.machineRepo.findById(machineId);
    if (!machine) {
      throw new NotFoundError('Machine not found');
    }
    assertRecordInTenant(machine, branch, 'Machine');

    const existing = await this.readingRepo.findByMachineIdAndYearMonth(
      machineId,
      targetYear,
      targetMonth,
    );
    if (existing) {
      throw new ValidationError(
        'This machine already has a reading for the selected month. Delete it first if you need to override.',
      );
    }

    const prev = getPreviousMonth(targetYear, targetMonth);
    const previousReading = await this.readingRepo.findByMachineIdAndYearMonth(
      machineId,
      prev.year,
      prev.month,
    );
    if (!isConsecutiveUnableToReadBlocked(previousReading)) {
      throw new ValidationError(
        'Override is only allowed when the previous month was also Unable to obtain',
      );
    }

    const now = new Date();
    const reading = await prisma.$transaction(async (tx) => {
      const saved = await tx.reading.upsert({
        where: {
          machineId_year_month: {
            machineId,
            year: targetYear,
            month: targetMonth,
          },
        },
        create: {
          machineId,
          year: targetYear,
          month: targetMonth,
          monoReading: null,
          colourReading: null,
          scanReading: null,
          note: null,
          monoUnchangedReason: null,
          colourUnchangedReason: null,
          scanUnchangedReason: null,
          unableToRead: true,
          unableToReadReason: trimmedReason,
          unableToReadOverride: true,
          unableToReadOverrideReason: trimmedReason,
          unableToReadOverrideBy: userId,
          unableToReadOverrideAt: now,
          monoUsage: null,
          colourUsage: null,
          scanUsage: null,
          capturedBy: userId,
          branch,
        },
        update: {
          monoReading: null,
          colourReading: null,
          scanReading: null,
          note: null,
          monoUnchangedReason: null,
          colourUnchangedReason: null,
          scanUnchangedReason: null,
          unableToRead: true,
          unableToReadReason: trimmedReason,
          unableToReadOverride: true,
          unableToReadOverrideReason: trimmedReason,
          unableToReadOverrideBy: userId,
          unableToReadOverrideAt: now,
          monoUsage: null,
          colourUsage: null,
          scanUsage: null,
        },
      });

      await this.unableToObtainOverrideRequestRepo.resolvePendingForMachinePeriod(
        machineId,
        targetYear,
        targetMonth,
        userId,
        tx,
      );

      return saved;
    });

    return {
      message: 'Unable to obtain override saved',
      reading,
      machine: {
        id: machine.id,
        machineSerialNumber: machine.machineSerialNumber,
        customer: machine.customer
          ? { id: machine.customer.id, name: machine.customer.name }
          : null,
      },
      previousUnableToReadReason: previousReading.unableToReadReason,
    };
  }

  /**
   * Export readings to Excel or text and lock the month
   * @param {number} year
   * @param {number} month
   * @param {string} branch
   * @param {string} userId
   * @param {string} format - 'xlsx' (default) or 'txt'
   * @returns {Promise<Buffer|string>}
   */
  async exportReadings(year, month, branch, userId, format = 'xlsx') {
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    // Get machines and readings
    // Use findActive to exclude decommissioned machines - matches the collection screen
    const [machines, currentReadings] = await Promise.all([
      this.machineRepo.findActive(branch, false),
      this.readingRepo.findByYearMonth(targetYear, targetMonth, branch),
    ]);

    const currentReadingMap = new Map(currentReadings.map(r => [r.machineId, r]));

    // Generate export based on format
    let result;
    if (format === 'txt') {
      result = Buffer.from(
        generateTextExport(machines, currentReadingMap, targetYear, targetMonth),
        'utf8'
      );
    } else {
      result = await generateExcelExport(
        machines,
        currentReadingMap,
        targetYear,
        targetMonth
      );
    }

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

    return result;
  }

  /**
   * Get reading history for a machine (tenant-scoped).
   * @param {string} machineId
   * @param {number} limit
   * @param {string} tenantBranch
   * @returns {Promise<Object>}
   */
  async getReadingHistory(machineId, limit = 12, tenantBranch) {
    const machine = await this.machineRepo.findById(machineId);
    assertRecordInTenant(machine, tenantBranch, 'Machine');

    const take = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 500);
    const readings = await this.readingRepo.findMany(
      { machineId, branch: tenantBranch },
      {
        take,
        /** Reading period (year/month), not capture timestamp */
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    );
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
              { customer: { name: 'asc' } },
              { machineSerialNumber: 'asc' },
            ],
            include: { model: { include: { make: true } }, customer: true },
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
    const count = await this.submissionRepo.deleteByYearMonth(year, month, branch);

    return {
      message: count > 0 ? 'Month unlocked successfully' : 'Month was not locked',
      year,
      month,
      branch,
    };
  }

  /**
   * Delete a reading for a specific machine, year, and month (admin only, tenant-scoped)
   * @param {string} machineId
   * @param {number} year
   * @param {number} month
   * @param {string} tenantBranch
   * @returns {Promise<Object>}
   */
  async deleteReading(machineId, year, month, tenantBranch) {
    const machine = await this.machineRepo.findById(machineId);
    assertRecordInTenant(machine, tenantBranch, 'Machine');

    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    const reading = await this.readingRepo.findByMachineIdAndYearMonth(machineId, targetYear, targetMonth);
    if (!reading || reading.branch !== tenantBranch) {
      throw new NotFoundError('Reading not found');
    }

    await this.readingRepo.deleteByMachineIdAndYearMonth(machineId, targetYear, targetMonth);

    return {
      message: 'Reading deleted successfully',
      machineId,
      year: targetYear,
      month: targetMonth,
    };
  }
}
