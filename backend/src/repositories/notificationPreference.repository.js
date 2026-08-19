import prisma from '../config/database.js';

export class NotificationPreferenceRepository {
  async findByUserId(userId) {
    return prisma.notificationPreference.findMany({
      where: { userId },
    });
  }

  /**
   * User IDs among `userIds` who have explicitly disabled `category`.
   * No row means enabled.
   */
  async findDisabledUserIds(userIds, category) {
    if (!userIds.length || !category) return [];
    const rows = await prisma.notificationPreference.findMany({
      where: {
        userId: { in: userIds },
        category,
        enabled: false,
      },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }

  async upsert(userId, category, enabled) {
    return prisma.notificationPreference.upsert({
      where: { userId_category: { userId, category } },
      update: { enabled },
      create: { userId, category, enabled },
    });
  }
}

export default new NotificationPreferenceRepository();
