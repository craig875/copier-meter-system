import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Notification Controller - Admin notifications (scoped to req.tenantBranch)
 */
export class NotificationController {
  constructor(notificationService = services.notification) {
    this.notificationService = notificationService;
  }

  getNotifications = asyncHandler(async (req, res) => {
    const { unreadOnly, limit } = req.query;
    const notifications = await this.notificationService.getForUser(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 50,
      branch: req.tenantBranch,
    });
    res.json({ notifications });
  });

  markRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await this.notificationService.markRead(id, req.user.id, req.tenantBranch);
    res.json({ success: true });
  });

  markAllRead = asyncHandler(async (req, res) => {
    await this.notificationService.markAllRead(req.user.id, req.tenantBranch);
    res.json({ success: true });
  });

  getUnreadCount = asyncHandler(async (req, res) => {
    const count = await this.notificationService.countUnread(req.user.id, req.tenantBranch);
    res.json({ count });
  });

  getPreferences = asyncHandler(async (req, res) => {
    const categories = await this.notificationService.getPreferences(req.user);
    res.json({ categories });
  });

  setPreference = asyncHandler(async (req, res) => {
    const { category, enabled } = req.body || {};
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be true or false' });
    }
    const categories = await this.notificationService.setPreference(req.user, category, enabled);
    res.json({ categories });
  });
}

const controller = new NotificationController();

export const getNotifications = controller.getNotifications.bind(controller);
export const markRead = controller.markRead.bind(controller);
export const markAllRead = controller.markAllRead.bind(controller);
export const getUnreadCount = controller.getUnreadCount.bind(controller);
export const getPreferences = controller.getPreferences.bind(controller);
export const setPreference = controller.setPreference.bind(controller);
