import { ConnectivityService } from './connectivity.service.js';
import { ReportService } from './reporting/report.service.js';
import { ConnectivityRepository } from './connectivity.repository.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { services } from '../services/index.js';
import { getMonitoringEngine } from './monitoring/engine.js';
import { resolveConnectivityBranch } from './connectivity-branch.util.js';

const repo = new ConnectivityRepository();
const auditService = services.audit;
const connectivityService = new ConnectivityService(repo);
const reportService = new ReportService(repo);

export class ConnectivityController {
  getDashboard = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const result = await connectivityService.getDashboard(branch);
    res.json(result);
  });

  getSummary = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const result = await connectivityService.getSummary(branch);
    res.json(result);
  });

  getTargets = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const filters = {
      branch,
      status: req.query.status,
      currentStatus: req.query.currentStatus,
      customerName: req.query.customerName,
      siteName: req.query.siteName,
    };
    const result = await connectivityService.getTargets(filters);
    res.json(result);
  });

  getTarget = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const checkLimit = req.query.checkLimit ? parseInt(req.query.checkLimit, 10) : undefined;
    const { startDate, endDate } = req.query;
    const options = { branch };
    if (checkLimit && checkLimit > 0) options.checkLimit = Math.min(checkLimit, 5000);
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    const result = await connectivityService.getTarget(req.params.id, options);
    res.json(result);
  });

  checkTarget = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const { target } = await connectivityService.getTarget(req.params.id, { branch });
    const engine = getMonitoringEngine();
    await engine.runCheck(target);
    const updated = await connectivityService.getTarget(req.params.id, { branch });
    res.json(updated);
  });

  createTarget = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const result = await connectivityService.createTarget(req.body, branch);
    auditService.log(req.user.id, 'connectivity_target_create', 'monitoring_target', result.target?.id, { customerName: result.target?.customerName });
    res.status(201).json(result);
  });

  updateTarget = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const result = await connectivityService.updateTarget(req.params.id, req.body, branch);
    auditService.log(req.user.id, 'connectivity_target_update', 'monitoring_target', req.params.id, {});
    res.json(result);
  });

  deleteTarget = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const result = await connectivityService.deleteTarget(req.params.id, branch);
    auditService.log(req.user.id, 'connectivity_target_delete', 'monitoring_target', req.params.id, {});
    res.json(result);
  });

  setTargetStatus = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const result = await connectivityService.setTargetStatus(req.params.id, req.body.status, branch);
    res.json(result);
  });

  getTimeWindows = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const result = await connectivityService.getTimeWindows(branch);
    res.json(result);
  });

  createOrUpdateTimeWindow = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const result = await connectivityService.createOrUpdateTimeWindow(req.body, branch);
    res.json(result);
  });

  getUptimeReport = asyncHandler(async (req, res) => {
    let { startDate, endDate, customerName, siteName, targetId } = req.query;
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = startDate || start.toISOString().slice(0, 10);
      endDate = endDate || end.toISOString().slice(0, 10);
    }
    const branch = resolveConnectivityBranch(req);
    const result = await reportService.getUptimeReport(
      startDate,
      endDate,
      customerName,
      siteName,
      targetId,
      branch
    );
    res.json(result);
  });

  getSlaReport = asyncHandler(async (req, res) => {
    let { startDate, endDate, customerName, siteName } = req.query;
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = startDate || start.toISOString().slice(0, 10);
      endDate = endDate || end.toISOString().slice(0, 10);
    }
    const branch = resolveConnectivityBranch(req);
    const result = await reportService.getSlaReport(
      startDate,
      endDate,
      customerName,
      siteName,
      branch
    );
    res.json(result);
  });

  exportReport = asyncHandler(async (req, res) => {
    let { startDate, endDate, format } = req.query;
    if (format === 'pdf') {
      return res.status(501).json({ error: 'PDF export not yet implemented' });
    }
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = startDate || start.toISOString().slice(0, 10);
      endDate = endDate || end.toISOString().slice(0, 10);
    }
    const branch = resolveConnectivityBranch(req);
    const csv = await reportService.exportCsv(startDate, endDate, branch);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="uptime-report-${startDate}-${endDate}.csv"`);
    res.send(csv);
  });

  getOutages = asyncHandler(async (req, res) => {
    const branch = resolveConnectivityBranch(req);
    const filters = {
      branch,
      targetId: req.query.targetId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const options = {
      limit: req.query.limit,
      offset: req.query.offset,
    };
    const result = await connectivityService.getOutages(filters, options);
    res.json(result);
  });
}

const controller = new ConnectivityController();

export const getDashboard = controller.getDashboard.bind(controller);
export const getSummary = controller.getSummary.bind(controller);
export const getTargets = controller.getTargets.bind(controller);
export const getTarget = controller.getTarget.bind(controller);
export const checkTarget = controller.checkTarget.bind(controller);
export const createTarget = controller.createTarget.bind(controller);
export const updateTarget = controller.updateTarget.bind(controller);
export const deleteTarget = controller.deleteTarget.bind(controller);
export const setTargetStatus = controller.setTargetStatus.bind(controller);
export const getTimeWindows = controller.getTimeWindows.bind(controller);
export const createOrUpdateTimeWindow = controller.createOrUpdateTimeWindow.bind(controller);
export const getUptimeReport = controller.getUptimeReport.bind(controller);
export const getSlaReport = controller.getSlaReport.bind(controller);
export const exportReport = controller.exportReport.bind(controller);
export const getOutages = controller.getOutages.bind(controller);
