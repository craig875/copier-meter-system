import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Notification Controller - Admin notifications
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
    });
    res.json({ notifications });
  });

  markRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await this.notificationService.markRead(id, req.user.id);
    res.json({ success: true });
  });

  markAllRead = asyncHandler(async (req, res) => {
    await this.notificationService.markAllRead(req.user.id);
    res.json({ success: true });
  });

  getUnreadCount = asyncHandler(async (req, res) => {
    const count = await this.notificationService.countUnread(req.user.id);
    res.json({ count });
  });
}

const controller = new NotificationController();

export const getNotifications = controller.getNotifications.bind(controller);
export const markRead = controller.markRead.bind(controller);
export const markAllRead = controller.markAllRead.bind(controller);
export const getUnreadCount = controller.getUnreadCount.bind(controller);
