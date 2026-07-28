import { Router } from 'express';
import {
  getModelParts,
  recordPartOrder,
  deletePartOrder,
  getMachineHistory,
  getSummary,
  getModelPartsAll,
  getModelPartById,
  createModelPart,
  updateModelPart,
  deleteModelPart,
  increaseCosts,
  getTonerAlerts,
  importPartOrders,
} from '../controllers/consumable.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenantBranch } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  recordPartOrderSchema,
  createModelPartSchema,
  updateModelPartSchema,
  increaseCostsSchema,
  consumableSummaryQuerySchema,
  importPartOrdersSchema,
} from '../schemas/consumable.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);

// Toner alerts are used in the meter-reading capture flow (capturers included).
router.get(
  '/toner-alerts',
  requirePermission('copiers.readings.view'),
  getTonerAlerts
);

// Model part CRUD - define before /model-parts to avoid :id capturing "all"
router.get(
  '/model-parts/all',
  requirePermission('copiers.consumables.parts.manage'),
  getModelPartsAll
);
router.post(
  '/model-parts/increase-costs',
  requirePermission('copiers.consumables.costs.increase'),
  validate(increaseCostsSchema),
  increaseCosts
);
router.get(
  '/model-parts/:id',
  requirePermission('copiers.consumables.parts.manage'),
  getModelPartById
);
router.post(
  '/model-parts',
  requirePermission('copiers.consumables.parts.manage'),
  validate(createModelPartSchema),
  createModelPart
);
router.put(
  '/model-parts/:id',
  requirePermission('copiers.consumables.parts.manage'),
  validate(updateModelPartSchema),
  updateModelPart
);
router.delete(
  '/model-parts/:id',
  requirePermission('copiers.consumables.parts.manage'),
  deleteModelPart
);

// Model parts for a model (used when ordering) - query ?model=XXX
router.get(
  '/model-parts',
  requirePermission('copiers.consumables.view'),
  getModelParts
);

// Record a part order/replacement
router.post(
  '/orders',
  requirePermission('copiers.consumables.order'),
  validate(recordPartOrderSchema),
  recordPartOrder
);

router.post(
  '/orders/import',
  requirePermission('copiers.consumables.import_orders'),
  validate(importPartOrdersSchema),
  importPartOrders
);

router.delete(
  '/orders/:id',
  requirePermission('copiers.consumables.delete_order'),
  deletePartOrder
);

// Machine consumable history
router.get(
  '/machines/:machineId/history',
  requirePermission('copiers.consumables.view'),
  getMachineHistory
);

// Summary view with filters
router.get(
  '/summary',
  requirePermission('copiers.consumables.view'),
  validateQuery(consumableSummaryQuerySchema),
  getSummary
);

export default router;
