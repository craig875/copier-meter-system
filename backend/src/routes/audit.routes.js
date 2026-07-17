import { Router } from 'express';
import { getAuditHistory } from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';

const router = Router();

router.use(authenticate);
// Stage D pilot: permission-based gate (replaces requireAdmin for this route group).
router.use(requirePermission('audit.view'));

router.get('/', getAuditHistory);

export default router;
