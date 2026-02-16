import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { hasAdminAccess } from '../utils/permissions.js';

/**
 * Consumable Controller - Part tracking, yield validation, charge calculation
 */
export class ConsumableController {
  constructor(consumableService = services.consumable) {
    this.consumableService = consumableService;
  }

  getModelParts = asyncHandler(async (req, res) => {
    const { modelId } = req.query;
    const branch = req.query.branch || (req.user?.branch ? String(req.user.branch) : null);
    const parts = await this.consumableService.getModelParts(modelId, branch);
    res.json({ parts });
  });

  recordPartOrder = asyncHandler(async (req, res) => {
    const data = { ...req.body, capturedBy: req.user.id };
    const result = await this.consumableService.recordPartOrder(data);
    // Notify admins (fire-and-forget)
    const { replacement } = result;
    if (replacement?.machineId && replacement?.modelPart?.partName) {
      services.notification.notifyPartOrderCaptured({
        machineId: replacement.machineId,
        partName: replacement.modelPart.partName,
        machineSerialNumber: replacement.machine?.machineSerialNumber || 'Unknown',
        customerName: replacement.machine?.customer?.name || null,
        capturedByName: req.user.name || req.user.email || 'A user',
        orderId: replacement.id,
      }).catch((err) => console.error('Part order notification error:', err));
    }
    res.status(201).json(result);
  });

  getMachineHistory = asyncHandler(async (req, res) => {
    const { machineId } = req.params;
    const branch = req.query.branch || (req.user?.branch ? String(req.user.branch) : null);
    const result = await this.consumableService.getMachineConsumableHistory(machineId, branch);
    res.json(result);
  });

  getSummary = asyncHandler(async (req, res) => {
    const branch = req.query.branch || req.user?.selectedBranch || (req.user?.branch ? String(req.user.branch) : null);
    const filters = {
      branch: branch && ['JHB', 'CT'].includes(branch) ? branch : null,
      model: req.query.model,
      partType: req.query.partType,
      complianceStatus: req.query.complianceStatus,
    };
    const result = await this.consumableService.getConsumableSummary(filters);
    res.json(result);
  });

  getModelPartsAll = asyncHandler(async (req, res) => {
    const branch = req.query.branch || (req.user?.branch ? String(req.user.branch) : null);
    const parts = await this.consumableService.listModelParts(branch);
    res.json({ parts });
  });

  getModelPartById = asyncHandler(async (req, res) => {
    const part = await this.consumableService.getModelPartById(req.params.id);
    res.json({ part });
  });

  createModelPart = asyncHandler(async (req, res) => {
    const result = await this.consumableService.createModelPart(req.body);
    res.status(201).json(result);
  });

  updateModelPart = asyncHandler(async (req, res) => {
    const result = await this.consumableService.updateModelPart(req.params.id, req.body);
    res.json(result);
  });

  deleteModelPart = asyncHandler(async (req, res) => {
    const result = await this.consumableService.deleteModelPart(req.params.id);
    res.json(result);
  });

  deletePartOrder = asyncHandler(async (req, res) => {
    const result = await this.consumableService.deletePartOrder(req.params.id);
    res.json(result);
  });

  getTonerAlerts = asyncHandler(async (req, res) => {
    const branch = req.query.branch || req.user?.selectedBranch || (req.user?.branch ? String(req.user.branch) : null);
    const result = await this.consumableService.getTonerAlertsByCustomer(branch);
    res.json(result);
  });

  importPartOrders = asyncHandler(async (req, res) => {
    const result = await this.consumableService.importPartOrders(req.body.data, req.user.id);
    res.json(result);
  });
}

const controller = new ConsumableController();
export const getModelParts = controller.getModelParts.bind(controller);
export const recordPartOrder = controller.recordPartOrder.bind(controller);
export const getMachineHistory = controller.getMachineHistory.bind(controller);
export const getSummary = controller.getSummary.bind(controller);
export const getModelPartsAll = controller.getModelPartsAll.bind(controller);
export const getModelPartById = controller.getModelPartById.bind(controller);
export const createModelPart = controller.createModelPart.bind(controller);
export const updateModelPart = controller.updateModelPart.bind(controller);
export const deleteModelPart = controller.deleteModelPart.bind(controller);
export const deletePartOrder = controller.deletePartOrder.bind(controller);
export const getTonerAlerts = controller.getTonerAlerts.bind(controller);
export const importPartOrders = controller.importPartOrders.bind(controller);
