import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireTenantBranch } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/requirePermission.js';
import {
  getNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
  getPreferences,
  setPreference,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(authenticate);
// Stage D pilot: permission-based gate (replaces requireAdmin for this route group).
router.use(requirePermission('notifications.access'));
router.use(requireTenantBranch);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/preferences', getPreferences);
router.put('/preferences', setPreference);
router.patch('/:id/read', markRead);
router.post('/mark-all-read', markAllRead);

export default router;
