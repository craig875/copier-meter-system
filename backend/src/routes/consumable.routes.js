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
import { authenticate, requireAdmin } from '../middleware/auth.js';
// requireAdmin = admin OR manager (elevated). Prefer requireStrictAdmin for admin-only.
import { requireTenantBranch } from '../middleware/tenant.js';
import { requireMeterReadingAccess, requireConsumableAccess } from '../middleware/permissions.js';
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

// Toner alerts are used in the meter-reading capture flow (capturers included),
// but should not grant access to the full consumables module.
router.get(
  '/toner-alerts',
  requireMeterReadingAccess,
  requirePermission('copiers.readings.view'),
  getTonerAlerts
);

// Everything else in this router is the Consumables module (excludes capturers)
router.use(requireConsumableAccess);

// Model part CRUD (admin) - define before /model-parts to avoid :id capturing "all"
router.get(
  '/model-parts/all',
  requireAdmin,
  requirePermission('copiers.consumables.parts.manage'),
  getModelPartsAll
);
router.post(
  '/model-parts/increase-costs',
  requireAdmin,
  requirePermission('copiers.consumables.costs.increase'),
  validate(increaseCostsSchema),
  increaseCosts
);
router.get(
  '/model-parts/:id',
  requireAdmin,
  requirePermission('copiers.consumables.parts.manage'),
  getModelPartById
);
router.post(
  '/model-parts',
  requireAdmin,
  requirePermission('copiers.consumables.parts.manage'),
  validate(createModelPartSchema),
  createModelPart
);
router.put(
  '/model-parts/:id',
  requireAdmin,
  requirePermission('copiers.consumables.parts.manage'),
  validate(updateModelPartSchema),
  updateModelPart
);
router.delete(
  '/model-parts/:id',
  requireAdmin,
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

// Import past part orders from CSV (admin only)
router.post(
  '/orders/import',
  requireAdmin,
  requirePermission('copiers.consumables.import_orders'),
  validate(importPartOrdersSchema),
  importPartOrders
);

// Delete a part order record (admin only)
router.delete(
  '/orders/:id',
  requireAdmin,
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
