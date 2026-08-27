import { repositories } from '../repositories/index.js';
import prisma from '../config/database.js';
import { MODULE_FIBRE_ORDERS } from '../utils/permissions.js';
import { normalizeBranch } from '../middleware/tenant.js';
import {
  categoriesAvailableToUser,
  isNotificationCategory,
} from '../notifications/categories.js';
import { AppError } from '../utils/errors.js';

/**
 * Notification Service - Business logic for admin notifications
 */
export class NotificationService {
  constructor(repos = repositories) {
    this.notificationRepo = repos.notification;
    this.preferenceRepo = repos.notificationPreference;
    this.userRepo = repos.user;
  }

  /**
   * Users who should receive in-app inbox alerts (notifications.access).
   * Enum `admin` is kept as a fallback for dual-run accounts without a role matrix row.
   */
  async getAdminUserIds() {
    const [notifyRoles, grantRows, denyRows, admins] = await Promise.all([
      prisma.role.findMany({
        where: {
          OR: [
            { key: 'owner' },
            { permissions: { some: { permissionKey: 'notifications.access' } } },
          ],
        },
        select: { id: true },
      }),
      prisma.userPermissionOverride.findMany({
        where: { permissionKey: 'notifications.access', effect: 'GRANT' },
        select: { userId: true },
      }),
      prisma.userPermissionOverride.findMany({
        where: { permissionKey: 'notifications.access', effect: 'DENY' },
        select: { userId: true },
      }),
      prisma.user.findMany({
        where: { role: 'admin' },
        select: { id: true },
      }),
    ]);

    const fromRoles = notifyRoles.length
      ? await prisma.user.findMany({
          where: { roleId: { in: notifyRoles.map((r) => r.id) } },
          select: { id: true },
        })
      : [];

    const deny = new Set(denyRows.map((r) => r.userId));
    const ids = new Set([
      ...admins.map((u) => u.id),
      ...fromRoles.map((u) => u.id),
      ...grantRows.map((r) => r.userId),
    ]);
    for (const id of deny) ids.delete(id);
    return [...ids];
  }

  /**
   * Admins and managers with Fibre Orders module (for fibre workflow alerts)
   */
  async getFibreOrderManagerUserIds() {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'admin' },
          {
            role: 'manager',
            modules: { has: MODULE_FIBRE_ORDERS },
          },
        ],
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  /**
   * Notify admins when a capturer adds a note to a meter reading
   * @param {Object} params
   * @param {string} params.machineSerialNumber
   * @param {string} params.machineId
   * @param {number} params.year
   * @param {number} params.month
   * @param {string} params.branch - branch for the reading (JHB/CT)
   * @param {string} params.note - the note text (truncated for message)
   * @param {string} params.capturerName - name of user who added the note
   */
  async notifyReadingNoteAdded({ machineSerialNumber, machineId, year, month, branch, note, capturerName }) {
    const adminIds = await this.getAdminUserIds();
    if (adminIds.length === 0) return;

    const tenantBranch = normalizeBranch(branch);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[month - 1];
    const noteSnippet = note && note.length > 50 ? note.substring(0, 50) + '...' : (note || '');
    const linkUrl = `/capture?year=${year}&month=${month}&machineId=${machineId}${tenantBranch ? `&branch=${tenantBranch}` : ''}`;

    await this.notificationRepo.createForUsers(adminIds, {
      branch: tenantBranch,
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
   * @param {string} params.branch - tenant branch for the order
   */
  async notifyPartOrderCaptured({
    machineId,
    partName,
    machineSerialNumber,
    customerName,
    capturedByName,
    orderId,
    branch,
  }) {
    const adminIds = await this.getAdminUserIds();
    if (adminIds.length === 0) return;

    const linkUrl = `/consumables/machines/${machineId}`;
    const customerStr = customerName ? ` (${customerName})` : '';
    const title = `Part order: ${partName} - ${machineSerialNumber}${customerStr}`;
    const message = `${capturedByName} recorded a new part order`;

    await this.notificationRepo.createForUsers(adminIds, {
      branch: normalizeBranch(branch),
      type: 'part_order_captured',
      title,
      message,
      linkUrl,
      entityType: 'part_order',
      entityId: orderId,
    });
  }

  /**
   * Notify managers when a sales agent requests a fibre order update
   */
  async notifyFibreOrderUpdateRequested({ order, salesAgentName, note, requestId }) {
    const managerIds = await this.getFibreOrderManagerUserIds();
    if (managerIds.length === 0) return;

    const linkUrl = `/fibre-orders/${order.id}`;
    const title = `Update requested: ${order.customerName}`;
    const message = note
      ? `${salesAgentName} requested an update — "${note.length > 80 ? `${note.slice(0, 80)}...` : note}"`
      : `${salesAgentName} requested a status update on this fibre order`;

    await this.notificationRepo.createForUsers(managerIds, {
      branch: normalizeBranch(order.branch),
      type: 'fibre_order_update_requested',
      title,
      message,
      linkUrl,
      entityType: 'fibre_order_update_request',
      entityId: requestId,
    });
  }

  /**
   * Notify administrators when a manager requests consecutive Unable-to-obtain override
   */
  async notifyUnableToObtainOverrideRequested({
    machine,
    year,
    month,
    branch,
    managerName,
    note,
    requestId,
  }) {
    const adminIds = await this.getAdminUserIds();
    if (adminIds.length === 0) return;

    const tenantBranch = normalizeBranch(branch);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[month - 1] || String(month);
    const serial = machine.machineSerialNumber || 'machine';
    const customer = machine.customer?.name ? ` — ${machine.customer.name}` : '';
    const linkUrl = `/admin/unable-to-obtain-overrides?year=${year}&month=${month}&machineId=${machine.id}`;
    const title = `U2O override requested: ${serial} (${monthName} ${year})`;
    const message = note
      ? `${managerName} requested approval${customer} — "${note.length > 80 ? `${note.slice(0, 80)}...` : note}"`
      : `${managerName} requested Unable to obtain override for ${serial}${customer} (${monthName} ${year}${tenantBranch ? `, ${tenantBranch}` : ''})`;

    await this.notificationRepo.createForUsers(adminIds, {
      branch: tenantBranch,
      type: 'unable_to_obtain_override_requested',
      title,
      message,
      linkUrl,
      entityType: 'unable_to_obtain_override_request',
      entityId: requestId,
    });
  }

  /**
   * Notify a single assignee when an install task is assigned (or reassigned) to them.
   * @param {Object} params
   * @param {string} params.assigneeUserId
   * @param {string} params.branch - install branch
   * @param {string} params.taskId
   * @param {string} params.taskTitle
   * @param {string} params.installId
   * @param {string} params.customerName
   * @param {string} [params.siteName]
   * @param {string} params.assignedByName
   */
  async notifyInstallTaskAssigned({
    assigneeUserId,
    branch,
    taskId,
    taskTitle,
    installId,
    customerName,
    siteName,
    assignedByName,
  }) {
    if (!assigneeUserId) return;

    const tenantBranch = normalizeBranch(branch);
    const location = siteName
      ? `${customerName} (${siteName})`
      : customerName || 'an installation';

    await this.notificationRepo.createForUsers([assigneeUserId], {
      branch: tenantBranch,
      type: 'install_task_assigned',
      title: `Task assigned: ${taskTitle}`,
      message: `${assignedByName} assigned you a task on ${location}`,
      linkUrl: `/installations/${installId}`,
      entityType: 'install_task',
      entityId: taskId,
    });
  }

  /**
   * Notify admins when a connectivity link goes down, is restored, or has DNS failure
   * @param {Object} target - MonitoringTarget with id, customerName, siteName, monitoringTarget, branch
   * @param {string} alertType - down, restored, dns_failure
   * @param {Object} details - { duration, message }
   */
  async notifyConnectivityLinkDown(target, alertType, details = {}) {
    const adminIds = await this.getAdminUserIds();
    if (adminIds.length === 0) return;

    const typeMap = {
      down: 'connectivity_link_down',
      restored: 'connectivity_link_restored',
      dns_failure: 'connectivity_dns_failure',
    };
    const type = typeMap[alertType] ?? 'connectivity_link_down';

    const label = alertType === 'down' ? 'Link down' : alertType === 'restored' ? 'Link restored' : 'DNS failure';
    const title = `${label}: ${target.customerName} - ${target.siteName}`;
    let message = `Target ${target.monitoringTarget}`;
    if (details.duration) message += ` (down for ${details.duration})`;
    else if (details.message) message += ` - ${details.message}`;

    const linkUrl = `/connectivity/targets/${target.id}`;

    await this.notificationRepo.createForUsers(adminIds, {
      branch: normalizeBranch(target.branch),
      type,
      title,
      message,
      linkUrl,
      entityType: 'connectivity_target',
      entityId: target.id,
    });
  }

  /**
   * Get notifications for current user (admin), scoped to active branch
   */
  async getForUser(userId, options = {}) {
    return this.notificationRepo.findByUserId(userId, options);
  }

  /**
   * Mark notification as read
   */
  async markRead(notificationId, userId, branch = null) {
    return this.notificationRepo.markRead(notificationId, userId, branch);
  }

  /**
   * Mark all as read for user (active branch)
   */
  async markAllRead(userId, branch = null) {
    return this.notificationRepo.markAllRead(userId, branch);
  }

  /**
   * Count unread for user (active branch)
   */
  async countUnread(userId, branch = null) {
    return this.notificationRepo.countUnread(userId, branch);
  }

  async getPreferences(user) {
    const available = categoriesAvailableToUser(user);
    const rows = await this.preferenceRepo.findByUserId(user.id);
    const byCategory = new Map(rows.map((row) => [row.category, row.enabled]));
    return available.map((cat) => ({
      category: cat.key,
      label: cat.label,
      description: cat.description,
      enabled: byCategory.has(cat.key) ? Boolean(byCategory.get(cat.key)) : true,
    }));
  }

  async setPreference(user, category, enabled) {
    if (!isNotificationCategory(category)) {
      throw new AppError('Unknown notification category', 400);
    }
    const allowed = categoriesAvailableToUser(user).some((cat) => cat.key === category);
    if (!allowed) {
      throw new AppError('You do not have that notification category', 403);
    }
    await this.preferenceRepo.upsert(user.id, category, Boolean(enabled));
    return this.getPreferences(user);
  }

  /**
   * Global connectivity in-app mute for a user.
   * Missing preference row means enabled (default on).
   */
  async getConnectivityAlertsEnabled(userId) {
    const rows = await this.preferenceRepo.findByUserId(userId);
    const row = rows.find((r) => r.category === 'connectivity');
    return row == null ? true : Boolean(row.enabled);
  }

  async setConnectivityAlertsEnabled(userId, enabled) {
    await this.preferenceRepo.upsert(userId, 'connectivity', Boolean(enabled));
    return { connectivityAlertsEnabled: Boolean(enabled) };
  }
}
