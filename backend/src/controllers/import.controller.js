import { services } from '../services/index.js';
import { ImportService } from '../services/import.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { hasAdminAccess } from '../utils/permissions.js';

/**
 * Import Controller - HTTP request/response handling for imports
 * Single Responsibility: HTTP layer only
 */
export class ImportController {
  constructor(importService = new ImportService(), auditService = services.audit) {
    this.importService = importService;
    this.auditService = auditService;
  }

  importMachines = asyncHandler(async (req, res) => {
    const { data, year, month } = req.body;
    const branch = hasAdminAccess(req.user.role) ? req.body.branch || req.user.branch : req.user.branch;
    
    if (!branch) {
      return res.status(400).json({ error: 'Branch is required' });
    }

    const userId = req.user.id;
    const result = await this.importService.importMachines(data, year, month, branch, userId);
    this.auditService.log(userId, 'machine_import', 'import', null, { year, month, branch, created: result.results?.created, updated: result.results?.updated });
    res.json(result);
  });

  importReadings = asyncHandler(async (req, res) => {
    const { data, year, month, branch } = req.body;
    
    if (!branch) {
      return res.status(400).json({ error: 'Branch is required' });
    }

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const userId = req.user.id;
    const result = await this.importService.importReadings(data, year, month, branch, userId);
    this.auditService.log(userId, 'reading_import', 'import', null, { year, month, branch, created: result.results?.readingsCreated });
    res.json(result);
  });
}

// Export singleton instance
const importController = new ImportController();

export const importMachines = importController.importMachines.bind(importController);
export const importReadings = importController.importReadings.bind(importController);