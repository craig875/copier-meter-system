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
import { requireConnectivityAccess, requireConnectivityManage } from '../middleware/permissions.js';
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
router.use(requireConnectivityAccess);

// Dashboard - all connectivity users
router.get('/dashboard', getDashboard);
router.get('/summary', getSummary);

// Targets - list and view
router.get('/targets', getTargets);
router.post('/targets/:id/check', requireConnectivityManage, checkTarget);
router.get('/targets/:id', getTarget);

// Targets - CRUD (admin only)
router.post('/targets', requireConnectivityManage, validate(monitoringTargetSchema), createTarget);
router.put('/targets/:id', requireConnectivityManage, validate(updateMonitoringTargetSchema), updateTarget);
router.delete('/targets/:id', requireConnectivityManage, deleteTarget);
router.patch('/targets/:id/status', requireConnectivityManage, validate(targetStatusSchema), setTargetStatus);

// Time windows (admin only)
router.get('/time-windows', requireConnectivityManage, getTimeWindows);
router.post('/time-windows', requireConnectivityManage, validate(alertTimeWindowSchema), createOrUpdateTimeWindow);

// Reports
router.get('/reports/uptime', validateQuery(uptimeReportQuerySchema), getUptimeReport);
router.get('/reports/sla', validateQuery(uptimeReportQuerySchema.partial()), getSlaReport);
router.get('/reports/export', validateQuery(exportReportQuerySchema), exportReport);

// Outages
router.get('/outages', validateQuery(outagesQuerySchema.partial()), getOutages);
router.patch('/outages/:id/note', validate(outageNoteSchema), updateOutageNote);

export default router;
