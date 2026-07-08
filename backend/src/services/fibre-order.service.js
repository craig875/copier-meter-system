import { repositories } from '../repositories/index.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { hasAdminAccess } from '../utils/permissions.js';

const TERMINAL_STATUSES = ['complete', 'cancelled'];

/**
 * Add calendar weeks to a date (UTC-safe for date-only fields).
 */
export function addWeeks(dateInput, weeks) {
  const d = new Date(dateInput);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}

export function parseDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function daysUntilInstall(expectedInstallDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expected = new Date(expectedInstallDate);
  expected.setHours(0, 0, 0, 0);
  const diffMs = expected.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Positive = weeks left; negative = weeks overdue */
export function daysToWeeksRemaining(days) {
  if (days === 0) return 0;
  if (days > 0) return Math.ceil(days / 7);
  return -Math.ceil(Math.abs(days) / 7);
}

function enrichOrder(order) {
  if (!order) return order;
  const daysRemaining = daysUntilInstall(order.expectedInstallDate);
  const weeksRemaining = daysToWeeksRemaining(daysRemaining);
  const isOverdue =
    !TERMINAL_STATUSES.includes(order.status) && weeksRemaining < 0;
  return {
    ...order,
    weeksRemaining,
    isOverdue,
  };
}

/**
 * Fibre Order Service - order tracking, ETA, status timeline
 */
export class FibreOrderService {
  constructor(repos = repositories) {
    this.orderRepo = repos.fibreOrder;
    this.productRepo = repos.fibreProduct;
    this.updateRepo = repos.orderUpdate;
    this.updateRequestRepo = repos.fibreOrderUpdateRequest;
    this.userRepo = repos.user;
  }

  canManageOrders(user) {
    return hasAdminAccess(user?.role);
  }

  buildListWhere(user, filters = {}) {
    const where = {};

    if (user.role === 'sales_agent') {
      where.salesAgentId = user.id;
    }

    // Sales agents see all orders allocated to them — not filtered by branch
    if (
      filters.branch &&
      ['JHB', 'CT'].includes(filters.branch) &&
      user.role !== 'sales_agent'
    ) {
      where.branch = filters.branch;
    }

    if (filters.status) {
      where.status = filters.status;
    } else if (filters.completedOnly === 'true' || filters.completedOnly === true) {
      where.status = 'complete';
    } else if (filters.activeOnly === 'true' || filters.activeOnly === true) {
      where.status = { notIn: TERMINAL_STATUSES };
    }

    if (filters.salesAgentId && this.canManageOrders(user)) {
      where.salesAgentId = filters.salesAgentId;
    }

    if (filters.search) {
      const s = filters.search.trim();
      if (s) {
        where.OR = [
          { customerName: { contains: s, mode: 'insensitive' } },
          { customerReference: { contains: s, mode: 'insensitive' } },
          { installationAddress: { contains: s, mode: 'insensitive' } },
        ];
      }
    }

    return where;
  }

  async listOrders(user, filters = {}) {
    const where = this.buildListWhere(user, filters);
    const orders = await this.orderRepo.findManyWithRelations(where);
    return orders.map(enrichOrder);
  }

  async getStats(user, branch = null) {
    const where = {};

    if (user.role === 'sales_agent') {
      where.salesAgentId = user.id;
    } else if (!this.canManageOrders(user)) {
      throw new ForbiddenError('Statistics are only available to administrators and managers');
    }

    if (
      branch &&
      ['JHB', 'CT'].includes(branch) &&
      user.role !== 'sales_agent'
    ) {
      where.branch = branch;
    }

    const activeWhere = {
      ...where,
      status: { notIn: TERMINAL_STATUSES },
    };

    const [byStatus, overdue, total, completed, pendingUpdateRequests] = await Promise.all([
      this.orderRepo.countByStatus(activeWhere),
      this.orderRepo.countOverdue(where),
      this.orderRepo.count(activeWhere),
      this.orderRepo.count({ ...where, status: 'complete' }),
      this.updateRequestRepo.countPending(where),
    ]);

    const statusCounts = Object.fromEntries(
      byStatus.map((row) => [row.status, row._count.status])
    );

    return {
      total,
      overdue,
      completed,
      pendingUpdateRequests,
      byStatus: statusCounts,
    };
  }

  async getOrderById(user, id) {
    const order = await this.orderRepo.findByIdWithRelations(id);
    if (!order) throw new NotFoundError('Fibre order');

    if (user.role === 'sales_agent' && order.salesAgentId !== user.id) {
      throw new ForbiddenError('You can only view orders assigned to you');
    }

    const pendingUpdateRequest = await this.updateRequestRepo.findPendingByOrderId(id);

    return {
      ...enrichOrder(order),
      pendingUpdateRequest,
    };
  }

  async getOrderUpdates(user, orderId) {
    await this.getOrderById(user, orderId);
    return this.updateRepo.findByOrderId(orderId);
  }

  async validateSalesAgent(salesAgentId) {
    const agent = await this.userRepo.findById(salesAgentId);
    if (!agent) throw new NotFoundError('Sales agent');
    if (agent.role !== 'sales_agent' && !hasAdminAccess(agent.role)) {
      throw new ValidationError('Selected user must be a sales agent or manager/admin');
    }
    return agent;
  }

  async computeExpectedInstallDate(productId, orderPlacementDate) {
    const product = await this.productRepo.findById(productId);
    if (!product || !product.isActive) throw new NotFoundError('Fibre product');
    const placement = typeof orderPlacementDate === 'string'
      ? parseDateOnly(orderPlacementDate)
      : orderPlacementDate;
    return addWeeks(placement, product.defaultEtaWeeks);
  }

  async createOrder(user, data) {
    if (!this.canManageOrders(user)) {
      throw new ForbiddenError('Only administrators and managers can create orders');
    }

    await this.validateSalesAgent(data.salesAgentId);
    const expectedInstallDate = await this.computeExpectedInstallDate(
      data.productId,
      data.orderPlacementDate
    );
    const status = data.status ?? 'order_placed';
    const placementDate = parseDateOnly(data.orderPlacementDate);

    const order = await this.orderRepo.create({
      branch: data.branch,
      customerName: data.customerName,
      customerReference: data.customerReference ?? null,
      installationAddress: data.installationAddress,
      productId: data.productId,
      salesAgentId: data.salesAgentId,
      orderPlacementDate: placementDate,
      expectedInstallDate,
      status,
      notes: data.notes ?? null,
      createdById: user.id,
    });

    await this.updateRepo.create({
      orderId: order.id,
      previousStatus: null,
      newStatus: status,
      note: 'Order created',
      updatedById: user.id,
    });

    return this.getOrderById(user, order.id);
  }

  async updateOrder(user, id, data) {
    if (!this.canManageOrders(user)) {
      throw new ForbiddenError('Only administrators and managers can update orders');
    }

    const existing = await this.orderRepo.findByIdWithRelations(id);
    if (!existing) throw new NotFoundError('Fibre order');

    const timelineNote = data.note?.trim() || null;
    const updateData = { ...data };
    delete updateData.status;
    delete updateData.note;

    if (data.salesAgentId) {
      await this.validateSalesAgent(data.salesAgentId);
    }

    const productId = data.productId ?? existing.productId;
    const placementInput = data.orderPlacementDate
      ? data.orderPlacementDate
      : existing.orderPlacementDate.toISOString().slice(0, 10);

    if (data.productId || data.orderPlacementDate) {
      updateData.expectedInstallDate = await this.computeExpectedInstallDate(
        productId,
        placementInput
      );
    }

    if (data.orderPlacementDate) {
      updateData.orderPlacementDate = parseDateOnly(data.orderPlacementDate);
    }

    const statusChanged = data.status && data.status !== existing.status;

    if (statusChanged) {
      await this.orderRepo.update(id, { ...updateData, status: data.status });
      await this.updateRepo.create({
        orderId: id,
        previousStatus: existing.status,
        newStatus: data.status,
        note: timelineNote,
        updatedById: user.id,
      });
    } else if (timelineNote) {
      if (Object.keys(updateData).length > 0) {
        await this.orderRepo.update(id, updateData);
      }
      await this.updateRepo.create({
        orderId: id,
        previousStatus: existing.status,
        newStatus: existing.status,
        note: timelineNote,
        updatedById: user.id,
      });
    } else {
      await this.orderRepo.update(id, updateData);
    }

    await this.updateRequestRepo.resolvePendingForOrder(id, user.id);

    return this.getOrderById(user, id);
  }

  async requestOrderUpdate(user, orderId, note) {
    if (user.role !== 'sales_agent') {
      throw new ForbiddenError('Only sales agents can request order updates');
    }

    const order = await this.getOrderById(user, orderId);
    if (order.pendingUpdateRequest) {
      throw new ValidationError('An update has already been requested for this order');
    }

    const request = await this.updateRequestRepo.create({
      orderId,
      requestedById: user.id,
      note: note?.trim() || null,
    });

    return request;
  }

  async listPendingUpdateRequests(user, branch = null) {
    if (!this.canManageOrders(user)) {
      throw new ForbiddenError('Only administrators and managers can view update requests');
    }

    const where = {};
    if (branch && ['JHB', 'CT'].includes(branch)) {
      where.order = { branch };
    }

    return this.updateRequestRepo.findManyPending(where);
  }

  async addNote(user, id, note) {
    if (!this.canManageOrders(user)) {
      throw new ForbiddenError('Only administrators and managers can add notes');
    }

    const existing = await this.orderRepo.findById(id);
    if (!existing) throw new NotFoundError('Fibre order');

    await this.updateRepo.create({
      orderId: id,
      previousStatus: existing.status,
      newStatus: existing.status,
      note,
      updatedById: user.id,
    });

    await this.updateRequestRepo.resolvePendingForOrder(id, user.id);

    return this.getOrderUpdates(user, id);
  }
}
