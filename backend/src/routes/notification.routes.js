import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markRead);
router.post('/mark-all-read', markAllRead);

export default router;
