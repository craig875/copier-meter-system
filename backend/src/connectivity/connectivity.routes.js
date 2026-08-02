import { Router } from 'express';
import {
  getDashboard,
  getSummary,
  getTargets,
  getTarget,
  checkTarget,
  createTarget,
  updateTarget,
  deleteTarget,
  setTargetStatus,
  getTimeWindows,
  createOrUpdateTimeWindow,
  getUptimeReport,
  getSlaReport,
  exportReport,
  getOutages,
  updateOutageNote,
} from './connectivity.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenantBranch } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  monitoringTargetSchema,
  updateMonitoringTargetSchema,
  targetStatusSchema,
  alertTimeWindowSchema,
  uptimeReportQuerySchema,
  exportReportQuerySchema,
  outagesQuerySchema,
  outageNoteSchema,
} from './connectivity.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);

// Dashboard - all connectivity users
router.get('/dashboard', requirePermission('connectivity.access'), getDashboard);
router.get('/summary', requirePermission('connectivity.access'), getSummary);

// Targets - list and view
router.get('/targets', requirePermission('connectivity.access'), getTargets);
router.post(
  '/targets/:id/check',
  requirePermission('connectivity.targets.check'),
  checkTarget
);
router.get('/targets/:id', requirePermission('connectivity.access'), getTarget);

// Targets - CRUD
router.post(
  '/targets',
  requirePermission('connectivity.targets.manage'),
  validate(monitoringTargetSchema),
  createTarget
);
router.put(
  '/targets/:id',
  requirePermission('connectivity.targets.manage'),
  validate(updateMonitoringTargetSchema),
  updateTarget
);
router.delete(
  '/targets/:id',
  requirePermission('connectivity.targets.manage'),
  deleteTarget
);
router.patch(
  '/targets/:id/status',
  requirePermission('connectivity.targets.manage'),
  validate(targetStatusSchema),
  setTargetStatus
);

// Time windows
router.get(
  '/time-windows',
  requirePermission('connectivity.time_windows.manage'),
  getTimeWindows
);
router.post(
  '/time-windows',
  requirePermission('connectivity.time_windows.manage'),
  validate(alertTimeWindowSchema),
  createOrUpdateTimeWindow
);

// Reports
router.get(
  '/reports/uptime',
  requirePermission('connectivity.reports.view'),
  validateQuery(uptimeReportQuerySchema),
  getUptimeReport
);
router.get(
  '/reports/sla',
  requirePermission('connectivity.reports.view'),
  validateQuery(uptimeReportQuerySchema.partial()),
  getSlaReport
);
router.get(
  '/reports/export',
  requirePermission('connectivity.reports.view'),
  validateQuery(exportReportQuerySchema),
  exportReport
);

// Outages
router.get(
  '/outages',
  requirePermission('connectivity.outages.view'),
  validateQuery(outagesQuerySchema.partial()),
  getOutages
);
router.patch(
  '/outages/:id/note',
  requirePermission('connectivity.outages.view'),
  validate(outageNoteSchema),
  updateOutageNote
);

export default router;
