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
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requireFibreOrderAccess } from '../middleware/permissions.js';
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
router.use(requireFibreOrderAccess);

router.get('/stats', validateQuery(fibreOrderStatsQuerySchema), getStats);
router.get('/update-requests', requireAdmin, listUpdateRequests);
router.get('/', validateQuery(fibreOrderListQuerySchema), listOrders);
router.get('/:id/updates', getOrderUpdates);
router.get('/:id', getOrder);
router.post('/', requireAdmin, validate(createFibreOrderSchema), createOrder);
router.post('/:id/request-update', validate(requestOrderUpdateSchema), requestOrderUpdate);
router.put('/:id', requireAdmin, validate(updateFibreOrderSchema), updateOrder);
router.post('/:id/notes', requireAdmin, validate(addOrderNoteSchema), addNote);

export default router;
