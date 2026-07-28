import { Router } from 'express';
import {
  listOrders,
  getStats,
  getOrder,
  getOrderUpdates,
  createOrder,
  updateOrder,
  addNote,
  requestOrderUpdate,
  listUpdateRequests,
} from '../controllers/fibre-order.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenantBranch } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  createFibreOrderSchema,
  updateFibreOrderSchema,
  addOrderNoteSchema,
  requestOrderUpdateSchema,
  fibreOrderListQuerySchema,
  fibreOrderStatsQuerySchema,
} from '../schemas/fibre-order.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);

router.get(
  '/stats',
  requirePermission('fibre_orders.access'),
  validateQuery(fibreOrderStatsQuerySchema),
  getStats
);
router.get(
  '/update-requests',
  requirePermission('fibre_orders.update_requests.list'),
  listUpdateRequests
);
router.get(
  '/',
  requirePermission('fibre_orders.access'),
  validateQuery(fibreOrderListQuerySchema),
  listOrders
);
router.get(
  '/:id/updates',
  requirePermission('fibre_orders.access'),
  getOrderUpdates
);
router.get('/:id', requirePermission('fibre_orders.access'), getOrder);
router.post(
  '/',
  requirePermission('fibre_orders.create'),
  validate(createFibreOrderSchema),
  createOrder
);
router.post(
  '/:id/request-update',
  requirePermission('fibre_orders.update_requests.create'),
  validate(requestOrderUpdateSchema),
  requestOrderUpdate
);
router.put(
  '/:id',
  requirePermission('fibre_orders.update'),
  validate(updateFibreOrderSchema),
  updateOrder
);
router.post(
  '/:id/notes',
  requirePermission('fibre_orders.notes'),
  validate(addOrderNoteSchema),
  addNote
);

export default router;
