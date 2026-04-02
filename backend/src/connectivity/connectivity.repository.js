import prisma from '../config/database.js';

/**
 * Connectivity Repository - Data access for connectivity monitoring
 * Abstracts Prisma - enables swapping implementations (SOLID/DIP)
 */
export class ConnectivityRepository {
  constructor(db = prisma) {
    this.prisma = db;
  }

  async findTargetsEnabled() {
    return this.prisma.monitoringTarget.findMany({
      where: { status: 'enabled' },
      orderBy: { customerName: 'asc' },
    });
  }

  async findTargetById(id, options = {}) {
    const checkLimit = options.checkLimit ?? 50;
    const { startDate, endDate } = options;
    const hasDateFilter = startDate || endDate;

    const checkResultsInclude = {
      orderBy: { checkedAt: hasDateFilter ? 'asc' : 'desc' },
      take: hasDateFilter ? 100000 : checkLimit,
    };
    if (hasDateFilter) {
      checkResultsInclude.where = {
        checkedAt: {},
      };
      if (startDate) checkResultsInclude.where.checkedAt.gte = new Date(startDate);
      if (endDate) checkResultsInclude.where.checkedAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    return this.prisma.monitoringTarget.findUnique({
      where: { id },
      include: {
        checkResults: checkResultsInclude,
      },
    });
  }

  async findCheckResults(targetId, options = {}) {
    const limit = options.limit ?? 200;
    const where = { targetId };
    if (options.startDate || options.endDate) {
      where.checkedAt = {};
      if (options.startDate) where.checkedAt.gte = new Date(options.startDate);
      if (options.endDate) where.checkedAt.lte = new Date(options.endDate + 'T23:59:59.999Z');
    }
    return this.prisma.monitoringCheckResult.findMany({
      where,
      orderBy: { checkedAt: 'asc' },
      take: limit,
    });
  }

  async findTargets(filters = {}, options = {}) {
    const where = {};
    if (filters.branch) where.branch = filters.branch;
    if (filters.status) where.status = filters.status;
    if (filters.currentStatus) where.currentStatus = filters.currentStatus;
    if (filters.customerName) {
      where.customerName = { contains: filters.customerName, mode: 'insensitive' };
    }
    if (filters.siteName) {
      where.siteName = { contains: filters.siteName, mode: 'insensitive' };
    }

    return this.prisma.monitoringTarget.findMany({
      where,
      orderBy: { customerName: 'asc' },
      ...options,
    });
  }

  async createTarget(data) {
    return this.prisma.monitoringTarget.create({ data });
  }

  async updateTarget(id, data) {
    const cleanData = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleanData[k] = v;
    }
    return this.prisma.monitoringTarget.update({
      where: { id },
      data: cleanData,
    });
  }

  async deleteTarget(id) {
    return this.prisma.monitoringTarget.delete({ where: { id } });
  }

  async saveCheckResult(targetId, result) {
    return this.prisma.monitoringCheckResult.create({
      data: {
        targetId,
        status: result.status,
        latencyMs: result.latencyMs,
        packetLossPercent: result.packetLossPercent ?? 0,
        lastSuccessfulPing: result.lastSuccessfulPing,
      },
    });
  }

  async updateTargetStatus(id, statusFields) {
    return this.prisma.monitoringTarget.update({
      where: { id },
      data: statusFields,
    });
  }

  async createOutageLog(data) {
    return this.prisma.outageLog.create({ data });
  }

  async updateOutageLog(id, data) {
    return this.prisma.outageLog.update({
      where: { id },
      data,
    });
  }

  async findOpenOutage(targetId) {
    return this.prisma.outageLog.findFirst({
      where: { targetId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findOutageLogs(filters = {}, options = {}) {
    const where = {};
    if (filters.targetId) where.targetId = filters.targetId;
    if (filters.branch) {
      where.target = { branch: filters.branch };
    }
    if (filters.startDate || filters.endDate) {
      where.startedAt = {};
      if (filters.startDate) where.startedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.startedAt.lte = new Date(filters.endDate + 'T23:59:59.999Z');
    }

    const [items, total] = await Promise.all([
      this.prisma.outageLog.findMany({
        where,
        include: { target: true },
        orderBy: { startedAt: 'desc' },
        skip: options.offset ?? 0,
        take: options.limit ?? 50,
      }),
      this.prisma.outageLog.count({ where }),
    ]);

    return { items, total };
  }

  async findCheckResultsForUptime(targetId, startDate, endDate) {
    return this.prisma.monitoringCheckResult.findMany({
      where: {
        targetId,
        checkedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59.999Z'),
        },
      },
      orderBy: { checkedAt: 'asc' },
    });
  }

  async findAlertTimeWindows(targetId = null) {
    const where = targetId ? { targetId } : { targetId: null };
    return this.prisma.alertTimeWindow.findMany({
      where: { ...where, enabled: true },
    });
  }

  async findAlertTimeWindowsForTarget(targetId) {
    const [global, targetSpecific] = await Promise.all([
      this.prisma.alertTimeWindow.findMany({
        where: { targetId: null, enabled: true },
      }),
      this.prisma.alertTimeWindow.findMany({
        where: { targetId, enabled: true },
      }),
    ]);
    return targetSpecific.length > 0 ? targetSpecific : global;
  }

  async createAlertTimeWindow(data) {
    return this.prisma.alertTimeWindow.create({ data });
  }

  async updateAlertTimeWindow(id, data) {
    return this.prisma.alertTimeWindow.update({
      where: { id },
      data,
    });
  }

  async findAllAlertTimeWindows(branch = null) {
    if (!branch) {
      return this.prisma.alertTimeWindow.findMany({
        include: { target: true },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.alertTimeWindow.findMany({
      where: {
        OR: [{ targetId: null }, { target: { branch } }],
      },
      include: { target: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAlertLog(data) {
    return this.prisma.alertLog.create({ data });
  }

  async findSlaTargets() {
    return this.prisma.slaTarget.findMany();
  }

  async upsertSlaTarget(serviceType, targetPercent) {
    return this.prisma.slaTarget.upsert({
      where: { serviceType },
      create: { serviceType, targetPercent },
      update: { targetPercent },
    });
  }
}
