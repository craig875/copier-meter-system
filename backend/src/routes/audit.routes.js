import { Router } from 'express';
import { getAuditHistory } from '../controllers/audit.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { shadowRequirePermission } from '../middleware/requirePermission.js';

const router = Router();

router.use(authenticate);
// Stage C: observe permission vs requireAdmin; never blocks.
router.use(shadowRequirePermission('audit.view'));
// requireAdmin = admin OR manager (elevated). Prefer requireStrictAdmin for admin-only.
router.use(requireAdmin);

router.get('/', getAuditHistory);

export default router;
