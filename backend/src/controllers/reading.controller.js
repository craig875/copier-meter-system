import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { hasAdminAccess } from '../utils/permissions.js';

/**
 * Reading Controller - HTTP request/response handling for readings
 * Single Responsibility: HTTP layer only - delegates to service layer
 */
export class ReadingController {
  constructor(readingService = services.reading) {
    this.readingService = readingService;
  }

  getReadings = asyncHandler(async (req, res) => {
    const { year, month, includeDecommissioned, branch: queryBranch } = req.query;
    
    // Admins can specify branch or use their branch, or see all if not specified
    // Non-admins use query branch if provided, otherwise their assigned branch, or see all if no branch assigned
    let branch = null;
    if (hasAdminAccess(req.user.role)) {
      branch = queryBranch || req.user.branch || null;
    } else {
      // For non-admins, use query branch if provided (from frontend), otherwise use their assigned branch
      // This ensures the frontend can control which branch to show
      branch = queryBranch || req.user.branch || null;
    }
    
    // If no branch specified, don't default - let the service handle it (show all or use machine's branch)
    // This allows admins to see all branches when no branch is selected

    const result = await this.readingService.getReadings(
      year,
      month,
      branch,
      includeDecommissioned === 'true'
    );
    
    res.json(result);
  });

  submitReadings = asyncHandler(async (req, res) => {
    const { year, month, readings } = req.body;
    
    // Admins and management can specify branch or use their branch
    // Non-admins use their branch, default to JHB if not set
    let branch = hasAdminAccess(req.user.role)
      ? req.body.branch || req.user.branch 
      : req.user.branch;
    
    // Default to JHB if no branch is set
    if (!branch) {
      branch = 'JHB';
    }

    const userId = req.user.id;
    const result = await this.readingService.submitReadings(year, month, branch, readings, userId);
    res.json(result);
  });

  exportReadings = asyncHandler(async (req, res) => {
    const { year, month, branch: queryBranch } = req.query;
    
    // Admins can specify branch or use their branch, or see all if not specified
    // Non-admins use query branch if provided, otherwise their assigned branch, or see all if no branch assigned
    let branch = null;
    if (hasAdminAccess(req.user.role)) {
      branch = queryBranch || req.user.branch || null;
    } else {
      // For non-admins, use query branch if provided (from frontend), otherwise use their assigned branch
      branch = queryBranch || req.user.branch || null;
    }

    const userId = req.user.id;
    const buffer = await this.readingService.exportReadings(year, month, branch, userId);

    const filename = `meter-readings-${branch || 'all'}-${year}-${String(month).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });

  getReadingHistory = asyncHandler(async (req, res) => {
    const { machineId } = req.params;
    const { limit = 12 } = req.query;
    
    // Get branch: admins and management can specify, non-admins use their branch
    // If no branch specified, don't filter by branch (show all history for that machine)
    let branch = null;
    if (hasAdminAccess(req.user.role)) {
      branch = req.query.branch || req.user.branch || null;
    } else {
      branch = req.user.branch || null;
    }
    
    const result = await this.readingService.getReadingHistory(machineId, limit, branch);
    res.json(result);
  });

  getReadingsSplitByBranch = asyncHandler(async (req, res) => {
    const { year, month, includeDecommissioned } = req.query;
    
    // Only admins can access split by branch view
    if (!hasAdminAccess(req.user.role)) {
      return res.status(403).json({ error: 'Only administrators can view split by branch data' });
    }

    const result = await this.readingService.getReadingsSplitByBranch(
      year,
      month,
      includeDecommissioned === 'true'
    );
    res.json(result);
  });

  exportReadingsSplitByBranch = asyncHandler(async (req, res) => {
    const { year, month } = req.query;
    
    // Only admins can export split by branch
    if (!hasAdminAccess(req.user.role)) {
      return res.status(403).json({ error: 'Only administrators can export split by branch data' });
    }

    const userId = req.user.id;
    const buffer = await this.readingService.exportReadingsSplitByBranch(year, month, userId);

    const filename = `meter-readings-all-branches-${year}-${String(month).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });

  deleteReading = asyncHandler(async (req, res) => {
    const { machineId } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const result = await this.readingService.deleteReading(machineId, year, month);
    res.json(result);
  });

  unlockMonth = async (req, res) => {
    try {
      const { year, month, branch } = req.query;

      if (!year || !month || !branch) {
        return res.status(400).json({ error: 'Year, month, and branch are required' });
      }

      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const b = String(branch).toUpperCase();
      if (isNaN(y) || isNaN(m) || !['JHB', 'CT'].includes(b)) {
        return res.status(400).json({ error: 'Invalid year, month, or branch' });
      }

      const result = await this.readingService.unlockMonth(y, m, b);
      res.json(result);
    } catch (err) {
      console.error('Unlock failed:', err);
      res.status(500).json({
        error: 'Failed to unlock',
        message: err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      });
    }
  };
}

// Export singleton instance
const readingController = new ReadingController();

export const getReadings = readingController.getReadings.bind(readingController);
export const submitReadings = readingController.submitReadings.bind(readingController);
export const exportReadings = readingController.exportReadings.bind(readingController);
export const getReadingHistory = readingController.getReadingHistory.bind(readingController);
export const getReadingsSplitByBranch = readingController.getReadingsSplitByBranch.bind(readingController);
export const exportReadingsSplitByBranch = readingController.exportReadingsSplitByBranch.bind(readingController);
export const deleteReading = readingController.deleteReading.bind(readingController);
export const unlockMonth = readingController.unlockMonth.bind(readingController);