import { repositories } from '../repositories/index.js';
import prisma from '../config/database.js';

/**
 * Notification Service - Business logic for admin notifications
 */
export class NotificationService {
  constructor(repos = repositories) {
    this.notificationRepo = repos.notification;
    this.userRepo = repos.user;
  }

  /**
   * Get admin user IDs
   */
  async getAdminUserIds() {
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    return admins.map((u) => u.id);
  }

  /**
   * Notify admins when a capturer adds a note to a meter reading
   * @param {Object} params
   * @param {string} params.machineSerialNumber
   * @param {string} params.machineId
   * @param {number} params.year
   * @param {number} params.month
   * @param {string} [params.branch] - branch for the reading (JHB/CT)
   * @param {string} params.note - the note text (truncated for message)
   * @param {string} params.capturerName - name of user who added the note
   */
  async notifyReadingNoteAdded({ machineSerialNumber, machineId, year, month, branch, note, capturerName }) {
    const adminIds = await this.getAdminUserIds();
    if (adminIds.length === 0) return;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[month - 1];
    const noteSnippet = note && note.length > 50 ? note.substring(0, 50) + '...' : (note || '');
    const linkUrl = `/capture?year=${year}&month=${month}&machineId=${machineId}${branch ? `&branch=${branch}` : ''}`;

    await this.notificationRepo.createForUsers(adminIds, {
      type: 'reading_note_added',
      title: `Note added to ${machineSerialNumber} (${monthName} ${year})`,
      message: `${capturerName} added a note: "${noteSnippet}"`,
      linkUrl,
      entityType: 'reading',
      entityId: `${machineId}-${year}-${month}`,
    });
  }

  /**
   * Notify admins when a part order is captured
   * @param {Object} params
   * @param {string} params.machineId
   * @param {string} params.partName
   * @param {string} params.machineSerialNumber
   * @param {string} [params.customerName]
   * @param {string} params.capturedByName - name of user who captured the order
   * @param {string} params.orderId - part replacement/order id for entity tracking
   */
  async notifyPartOrderCaptured({ machineId, partName, machineSerialNumber, customerName, capturedByName, orderId }) {
    const adminIds = await this.getAdminUserIds();
    if (adminIds.length === 0) return;

    const linkUrl = `/consumables/machines/${machineId}`;
    const customerStr = customerName ? ` (${customerName})` : '';
    const title = `Part order: ${partName} - ${machineSerialNumber}${customerStr}`;
    const message = `${capturedByName} recorded a new part order`;

    await this.notificationRepo.createForUsers(adminIds, {
      type: 'part_order_captured',
      title,
      message,
      linkUrl,
      entityType: 'part_order',
      entityId: orderId,
    });
  }

  /**
   * Get notifications for current user (admin)
   */
  async getForUser(userId, options = {}) {
    return this.notificationRepo.findByUserId(userId, options);
  }

  /**
   * Mark notification as read
   */
  async markRead(notificationId, userId) {
    return this.notificationRepo.markRead(notificationId, userId);
  }

  /**
   * Mark all as read for user
   */
  async markAllRead(userId) {
    return this.notificationRepo.markAllRead(userId);
  }

  /**
   * Count unread for user
   */
  async countUnread(userId) {
    return this.notificationRepo.countUnread(userId);
  }
}
