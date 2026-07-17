import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { hasAdminAccess, isStrictAdmin } from '../utils/permissions.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';

/**
 * Reading Controller - HTTP request/response handling for readings
 */
export class ReadingController {
  constructor(readingService = services.reading, auditService = services.audit) {
    this.readingService = readingService;
    this.auditService = auditService;
  }

  getReadings = asyncHandler(async (req, res) => {
    const { year, month, includeDecommissioned } = req.query;
    const result = await this.readingService.getReadings(
      year,
      month,
      req.tenantBranch,
      includeDecommissioned === 'true',
    );
    res.json(result);
  });

  submitReadings = asyncHandler(async (req, res) => {
    const { year, month, readings } = req.body;
    const branch = req.tenantBranch;
    const userId = req.user.id;

    if (!hasAdminAccess(req.user.role) && readings.some((r) => r.unableToRead === true)) {
      throw new ValidationError('Only administrators and managers can mark readings as Unable to obtain');
    }

    const result = await this.readingService.submitReadings(year, month, branch, readings, userId);
    this.auditService.log(userId, 'reading_submit', 'reading', null, {
      year,
      month,
      branch,
      savedCount: result.savedCount,
    });

    try {
      const readingsWithNotes = readings.filter((r) => r.note && String(r.note).trim().length > 0);
      if (readingsWithNotes.length > 0 && (req.user.role === 'capturer' || req.user.role === 'meter_user')) {
        const { services: svc } = await import('../services/index.js');
        const { repositories } = await import('../repositories/index.js');
        const machines = await repositories.machine.findByIds(readingsWithNotes.map((r) => r.machineId));
        const machineMap = new Map((machines || []).map((m) => [m.id, m]));
        const capturerName = req.user.name || req.user.email || 'A user';
        for (const r of readingsWithNotes) {
          const machine = machineMap.get(r.machineId);
          if (machine) {
            svc.notification.notifyReadingNoteAdded({
              machineSerialNumber: machine.machineSerialNumber,
              machineId: r.machineId,
              year: parseInt(year, 10),
              month: parseInt(month, 10),
              branch,
              note: r.note.trim(),
              capturerName,
            }).catch((err) => console.error('Notification error:', err));
          }
        }
      }
    } catch (err) {
      console.error('Failed to create notifications (readings still saved):', err);
    }

    res.json(result);
  });

  exportReadings = asyncHandler(async (req, res) => {
    const { year, month, format = 'xlsx' } = req.query;
    const branch = req.tenantBranch;
    const exportFormat = String(format).toLowerCase() === 'txt' ? 'txt' : 'xlsx';
    const userId = req.user.id;
    const buffer = await this.readingService.exportReadings(year, month, branch, userId, exportFormat);
    this.auditService.log(userId, 'reading_export', 'reading', null, {
      year,
      month,
      branch,
      format: exportFormat,
    });

    const ext = exportFormat === 'txt' ? 'txt' : 'xlsx';
    const filename = `meter-readings-${branch}-${year}-${String(month).padStart(2, '0')}.${ext}`;
    res.setHeader(
      'Content-Type',
      exportFormat === 'txt'
        ? 'text/plain; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });

  getReadingHistory = asyncHandler(async (req, res) => {
    const { machineId } = req.params;
    const { limit = 12 } = req.query;
    const result = await this.readingService.getReadingHistory(
      machineId,
      limit,
      req.tenantBranch,
    );
    res.json(result);
  });

  getReadingsSplitByBranch = asyncHandler(async (_req, _res) => {
    throw new ForbiddenError('Cross-branch reading views are disabled under hard tenancy');
  });

  exportReadingsSplitByBranch = asyncHandler(async (_req, _res) => {
    throw new ForbiddenError('Cross-branch reading exports are disabled under hard tenancy');
  });

  deleteReading = asyncHandler(async (req, res) => {
    const { machineId } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const result = await this.readingService.deleteReading(
      machineId,
      year,
      month,
      req.tenantBranch,
    );
    this.auditService.log(req.user.id, 'reading_delete', 'reading', machineId, { year, month });
    res.json(result);
  });

  unlockMonth = asyncHandler(async (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const b = req.tenantBranch;
    if (isNaN(y) || isNaN(m)) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    const result = await this.readingService.unlockMonth(y, m, b);
    this.auditService.log(req.user.id, 'reading_unlock', 'reading', null, {
      year: y,
      month: m,
      branch: b,
    });
    res.json(result);
  });

  listUnableToObtainBlocked = asyncHandler(async (req, res) => {
    if (!isStrictAdmin(req.user.role)) {
      throw new ForbiddenError('Only administrators can view Unable to obtain overrides');
    }
    const { year, month } = req.query;
    const result = await this.readingService.listUnableToObtainBlocked(
      year,
      month,
      req.tenantBranch,
    );
    res.json(result);
  });

  forceUnableToObtainOverride = asyncHandler(async (req, res) => {
    if (!isStrictAdmin(req.user.role)) {
      throw new ForbiddenError('Only administrators can force-approve consecutive Unable to obtain');
    }
    const { year, month, machineId, reason } = req.body;
    const branch = req.tenantBranch;
    const userId = req.user.id;

    const result = await this.readingService.forceUnableToObtainOverride(
      year,
      month,
      branch,
      machineId,
      reason,
      userId,
    );

    this.auditService.log(userId, 'unable_to_read_override', 'reading', result.reading?.id, {
      year,
      month,
      branch,
      machineId,
      machineSerialNumber: result.machine?.machineSerialNumber,
      customerName: result.machine?.customer?.name || null,
      previousUnableToReadReason: result.previousUnableToReadReason || null,
      overrideReason: reason?.trim?.() || reason,
    });

    res.json(result);
  });

  requestUnableToObtainOverride = asyncHandler(async (req, res) => {
    // Align with route requireAdmin: admin OR manager (elevated).
    if (!hasAdminAccess(req.user.role)) {
      throw new ForbiddenError('Administrator or manager access required to request Unable to obtain override approval');
    }
    const { year, month, machineId, note } = req.body;
    const branch = req.tenantBranch;

    const result = await this.readingService.requestUnableToObtainOverride(
      year,
      month,
      branch,
      machineId,
      note,
      req.user.id,
    );

    try {
      const { services: svc } = await import('../services/index.js');
      await svc.notification.notifyUnableToObtainOverrideRequested({
        machine: result.machine,
        year,
        month,
        branch,
        managerName: req.user.name || req.user.email || 'A manager',
        note,
        requestId: result.request.id,
      });
    } catch (err) {
      console.error('Failed to notify admins of U2O override request:', err);
    }

    this.auditService.log(req.user.id, 'unable_to_read_override_requested', 'unable_to_obtain_override_request', result.request.id, {
      year,
      month,
      branch,
      machineId,
      machineSerialNumber: result.machine?.machineSerialNumber,
    });

    res.status(201).json(result);
  });
}

const readingController = new ReadingController();

export const getReadings = readingController.getReadings.bind(readingController);
export const submitReadings = readingController.submitReadings.bind(readingController);
export const exportReadings = readingController.exportReadings.bind(readingController);
export const getReadingHistory = readingController.getReadingHistory.bind(readingController);
export const getReadingsSplitByBranch = readingController.getReadingsSplitByBranch.bind(readingController);
export const exportReadingsSplitByBranch = readingController.exportReadingsSplitByBranch.bind(readingController);
export const deleteReading = readingController.deleteReading.bind(readingController);
export const unlockMonth = readingController.unlockMonth.bind(readingController);
export const listUnableToObtainBlocked = readingController.listUnableToObtainBlocked.bind(readingController);
export const forceUnableToObtainOverride = readingController.forceUnableToObtainOverride.bind(readingController);
export const requestUnableToObtainOverride = readingController.requestUnableToObtainOverride.bind(readingController);
