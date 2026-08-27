import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { hasAdminAccess } from '../utils/permissions.js';
import { userHasPermission } from '../middleware/requirePermission.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import prisma from '../config/database.js';

function canManageNotificationPreferences(requester, targetUserId) {
  if (requester?.id === targetUserId) return true;
  if (hasAdminAccess(requester?.role)) return true;
  if (userHasPermission(requester, 'users.update')) return true;
  return false;
}

/**
 * Per-user notification preferences (connectivity mute) — self or admin-on-behalf.
 */
export class UserNotificationPreferencesController {
  constructor(notificationService = services.notification) {
    this.notificationService = notificationService;
  }

  get = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!canManageNotificationPreferences(req.user, id)) {
      throw new ForbiddenError('Permission denied');
    }
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundError('User not found');
    }
    const connectivityAlertsEnabled =
      await this.notificationService.getConnectivityAlertsEnabled(id);
    res.json({ connectivityAlertsEnabled });
  });

  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!canManageNotificationPreferences(req.user, id)) {
      throw new ForbiddenError('Permission denied');
    }
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundError('User not found');
    }
    const result = await this.notificationService.setConnectivityAlertsEnabled(
      id,
      req.body.connectivityAlertsEnabled
    );
    res.json(result);
  });
}

const controller = new UserNotificationPreferencesController();

export const getUserNotificationPreferences = controller.get.bind(controller);
export const updateUserNotificationPreferences = controller.update.bind(controller);
