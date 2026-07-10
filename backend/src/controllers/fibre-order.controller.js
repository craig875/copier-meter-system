import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class FibreOrderController {
  constructor(fibreOrderService = services.fibreOrder) {
    this.fibreOrderService = fibreOrderService;
  }

  listOrders = asyncHandler(async (req, res) => {
    const filters = {
      branch: req.tenantBranch,
      pipelineStatus: req.query.pipelineStatus,
      overlayStatus: req.query.overlayStatus,
      salesAgentId: req.query.salesAgentId,
      search: req.query.search,
      activeOnly: req.query.activeOnly,
      completedOnly: req.query.completedOnly,
    };
    const orders = await this.fibreOrderService.listOrders(req.user, filters);
    res.json({ orders });
  });

  getStats = asyncHandler(async (req, res) => {
    const stats = await this.fibreOrderService.getStats(req.user, req.tenantBranch);
    res.json(stats);
  });

  getOrder = asyncHandler(async (req, res) => {
    const order = await this.fibreOrderService.getOrderById(
      req.user,
      req.params.id,
      req.tenantBranch,
    );
    res.json({ order });
  });

  getOrderUpdates = asyncHandler(async (req, res) => {
    const updates = await this.fibreOrderService.getOrderUpdates(
      req.user,
      req.params.id,
      req.tenantBranch,
    );
    res.json({ updates });
  });

  createOrder = asyncHandler(async (req, res) => {
    const order = await this.fibreOrderService.createOrder(
      req.user,
      req.body,
      req.tenantBranch,
    );
    res.status(201).json({ order });
  });

  updateOrder = asyncHandler(async (req, res) => {
    const order = await this.fibreOrderService.updateOrder(
      req.user,
      req.params.id,
      req.body,
      req.tenantBranch,
    );
    res.json({ order });
  });

  addNote = asyncHandler(async (req, res) => {
    const updates = await this.fibreOrderService.addNote(
      req.user,
      req.params.id,
      req.body.note,
      req.tenantBranch,
    );
    res.status(201).json({ updates });
  });

  requestOrderUpdate = asyncHandler(async (req, res) => {
    const request = await this.fibreOrderService.requestOrderUpdate(
      req.user,
      req.params.id,
      req.body.note,
      req.tenantBranch,
    );
    await services.notification.notifyFibreOrderUpdateRequested({
      order: request.order,
      salesAgentName: req.user.name,
      note: req.body.note,
      requestId: request.id,
    });
    res.status(201).json({ request });
  });

  listUpdateRequests = asyncHandler(async (req, res) => {
    const requests = await this.fibreOrderService.listPendingUpdateRequests(
      req.user,
      req.tenantBranch,
    );
    res.json({ requests });
  });
}

const controller = new FibreOrderController();
export const listOrders = controller.listOrders.bind(controller);
export const getStats = controller.getStats.bind(controller);
export const getOrder = controller.getOrder.bind(controller);
export const getOrderUpdates = controller.getOrderUpdates.bind(controller);
export const createOrder = controller.createOrder.bind(controller);
export const updateOrder = controller.updateOrder.bind(controller);
export const addNote = controller.addNote.bind(controller);
export const requestOrderUpdate = controller.requestOrderUpdate.bind(controller);
export const listUpdateRequests = controller.listUpdateRequests.bind(controller);
