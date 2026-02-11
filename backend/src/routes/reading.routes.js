import { Router } from 'express';
import {
  getReadings,
  submitReadings,
  exportReadings,
  getReadingHistory,
  getReadingsSplitByBranch,
  exportReadingsSplitByBranch,
  deleteReading,
} from '../controllers/reading.controller.js';
import { importReadings } from '../controllers/import.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requireMeterReadingAccess } from '../middleware/permissions.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { submitReadingsSchema, readingsQuerySchema, exportQuerySchema, importReadingsSchema } from '../schemas/reading.schema.js';

const router = Router();

// All reading routes require authentication and meter reading access
router.use(authenticate);
router.use(requireMeterReadingAccess);

router.get('/', validateQuery(readingsQuerySchema), getReadings);
router.post('/', validate(submitReadingsSchema), submitReadings);
router.post('/import', requireAdmin, validate(importReadingsSchema), importReadings);
router.get('/export', validateQuery(exportQuerySchema), exportReadings);
router.get('/split-by-branch', validateQuery(readingsQuerySchema), getReadingsSplitByBranch);
router.get('/export/split-by-branch', validateQuery(exportQuerySchema), exportReadingsSplitByBranch);
router.get('/history/:machineId', getReadingHistory);
router.delete('/machine/:machineId', requireAdmin, deleteReading);

export default router;
