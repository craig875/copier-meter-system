import prisma from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Notification Repository - Data access for notifications
 */
export class NotificationRepository {
  /**
   * Create a notification
   */
  async create(data) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        branch: data.branch ?? null,
        type: data.type,
        title: data.title,
        message: data.message ?? null,
        linkUrl: data.linkUrl ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
      },
    });
  }

  /**
   * Create notifications for multiple users (e.g. all admins)
   */
  async createForUsers(userIds, data) {
    if (userIds.length === 0) return [];
    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        branch: data.branch ?? null,
        type: data.type,
        title: data.title,
        message: data.message ?? null,
        linkUrl: data.linkUrl ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
      })),
    });
    return notifications;
  }

  /**
   * Find notifications for a user, ordered by created_at desc
   */
  async findByUserId(userId, options = {}) {
    const { limit = 50, unreadOnly = false, branch = null } = options;
    return prisma.notification.findMany({
      where: {
        userId,
        ...(branch ? { branch } : {}),
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Mark notification as read (optionally scoped to active branch)
   */
  async markRead(id, userId, branch = null) {
    const existing = await prisma.notification.findFirst({
      where: {
        id,
        userId,
        ...(branch ? { branch } : {}),
      },
    });
    if (!existing) throw new NotFoundError('Notification');
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for user (optionally scoped to active branch)
   */
  async markAllRead(userId, branch = null) {
    return prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        ...(branch ? { branch } : {}),
      },
      data: { readAt: new Date() },
    });
  }

  /**
   * Count unread for user (optionally scoped to active branch)
   */
  async countUnread(userId, branch = null) {
    return prisma.notification.count({
      where: {
        userId,
        readAt: null,
        ...(branch ? { branch } : {}),
      },
    });
  }
}

export default new NotificationRepository();
