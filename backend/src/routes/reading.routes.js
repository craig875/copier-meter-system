import { Router } from 'express';
import {
  getReadings,
  submitReadings,
  exportReadings,
  getReadingHistory,
  getReadingsSplitByBranch,
  exportReadingsSplitByBranch,
  deleteReading,
  unlockMonth,
  listUnableToObtainBlocked,
  forceUnableToObtainOverride,
  requestUnableToObtainOverride,
} from '../controllers/reading.controller.js';
import { importReadings } from '../controllers/import.controller.js';
import { authenticate, requireAdmin, requireStrictAdmin } from '../middleware/auth.js';
// requireAdmin = admin OR manager (elevated). Prefer requireStrictAdmin for admin-only.
import { requireTenantBranch } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  submitReadingsSchema,
  readingsQuerySchema,
  exportQuerySchema,
  importReadingsSchema,
  unableToObtainOverrideSchema,
  unableToObtainOverrideRequestSchema,
} from '../schemas/reading.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);

router.get(
  '/',
  requirePermission('copiers.readings.view'),
  validateQuery(readingsQuerySchema),
  getReadings
);
router.post(
  '/',
  requirePermission('copiers.readings.submit'),
  validate(submitReadingsSchema),
  submitReadings
);
router.post(
  '/import',
  requireAdmin,
  requirePermission('copiers.readings.import'),
  validate(importReadingsSchema),
  importReadings
);
router.get(
  '/export',
  requirePermission('copiers.readings.export'),
  validateQuery(exportQuerySchema),
  exportReadings
);
router.get(
  '/split-by-branch',
  requirePermission('copiers.readings.view'),
  validateQuery(readingsQuerySchema),
  getReadingsSplitByBranch
);
router.get(
  '/export/split-by-branch',
  requirePermission('copiers.readings.export'),
  validateQuery(exportQuerySchema),
  exportReadingsSplitByBranch
);
router.get(
  '/unable-to-obtain-blocked',
  requireStrictAdmin,
  requirePermission('copiers.readings.uto_list_blocked'),
  validateQuery(readingsQuerySchema),
  listUnableToObtainBlocked
);
router.post(
  '/unable-to-obtain-override',
  requireStrictAdmin,
  requirePermission('copiers.readings.uto_force_override'),
  validate(unableToObtainOverrideSchema),
  forceUnableToObtainOverride
);
router.post(
  '/unable-to-obtain-override-request',
  requireAdmin,
  requirePermission('copiers.readings.uto_request_override'),
  validate(unableToObtainOverrideRequestSchema),
  requestUnableToObtainOverride
);
router.get(
  '/history/:machineId',
  requirePermission('copiers.readings.view'),
  getReadingHistory
);
router.delete(
  '/machine/:machineId',
  requireAdmin,
  requirePermission('copiers.readings.delete'),
  deleteReading
);
router.post(
  '/unlock',
  requireAdmin,
  requirePermission('copiers.readings.unlock_month'),
  unlockMonth
);

export default router;
