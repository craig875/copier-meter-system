import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Audit Controller - Transaction history for admins
 */
export class AuditController {
  constructor(auditService = services.audit) {
    this.auditService = auditService;
  }

  getHistory = asyncHandler(async (req, res) => {
    const { userId, action, limit, offset } = req.query;
    const result = await this.auditService.getHistory({
      userId: userId || undefined,
      action: action || undefined,
      limit: limit || 100,
      offset: offset || 0,
    });
    res.json(result);
  });
}

const auditController = new AuditController();
export const getAuditHistory = auditController.getHistory.bind(auditController);
