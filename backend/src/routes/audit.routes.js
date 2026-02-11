import { Router } from 'express';
import { getAuditHistory } from '../controllers/audit.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', getAuditHistory);

export default router;
