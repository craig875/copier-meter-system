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
  getTonerAlerts,
} from '../controllers/consumable.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requireMeterReadingAccess } from '../middleware/permissions.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  recordPartOrderSchema,
  createModelPartSchema,
  updateModelPartSchema,
  consumableSummaryQuerySchema,
} from '../schemas/consumable.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireMeterReadingAccess);

// Model part CRUD (admin) - define before /model-parts to avoid :id capturing "all"
router.get('/model-parts/all', requireAdmin, getModelPartsAll);
router.get('/model-parts/:id', requireAdmin, getModelPartById);
router.post('/model-parts', requireAdmin, validate(createModelPartSchema), createModelPart);
router.put('/model-parts/:id', requireAdmin, validate(updateModelPartSchema), updateModelPart);
router.delete('/model-parts/:id', requireAdmin, deleteModelPart);

// Model parts for a model (used when ordering) - query ?model=XXX
router.get('/model-parts', getModelParts);

// Record a part order/replacement
router.post('/orders', validate(recordPartOrderSchema), recordPartOrder);

// Delete a part order record (admin only)
router.delete('/orders/:id', requireAdmin, deletePartOrder);

// Machine consumable history
router.get('/machines/:machineId/history', getMachineHistory);

// Summary view with filters
router.get('/summary', validateQuery(consumableSummaryQuerySchema), getSummary);

// Toner alerts by customer (for warning badges on customer tiles)
router.get('/toner-alerts', getTonerAlerts);

export default router;
