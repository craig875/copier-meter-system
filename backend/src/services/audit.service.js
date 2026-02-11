import prisma from '../config/database.js';

/**
 * Audit Service - Logs user actions for transaction history
 * Fire-and-forget: errors are logged but don't block the main flow
 */
export class AuditService {
  async log(userId, action, entityType, entityId = null, details = null) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          details: details ? JSON.parse(JSON.stringify(details)) : null,
        },
      });
    } catch (err) {
      console.error('Audit log failed:', err.message);
    }
  }

  async getHistory(options = {}) {
    const { userId, action, limit = 100, offset = 0 } = options;
    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit, 10) || 100, 500),
        skip: parseInt(offset, 10) || 0,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
