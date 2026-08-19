// backend/routes/finance.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import * as financeController from '../controllers/finance.controller.js';

const router = express.Router();

router.use(authenticate);
 
// ── Engine 3 Lookup ───────────────────────────────────────────────
router.get(
  '/lookup/:branch',
  requirePermission('finance.lookup.view'),
  financeController.getLookup
);
 
router.post(
  '/lookup/:branch',
  requirePermission('finance.lookup.manage'),
  financeController.saveLookup
);
 
// ── Exclusions ────────────────────────────────────────────────────
router.get(
  '/exclusions/:branch',
  requirePermission('finance.exclusions.view'),
  financeController.getExclusions
);
 
router.post(
  '/exclusions/:branch',
  requirePermission('finance.exclusions.manage'),
  financeController.saveExclusions
);
 
// ── Billing Runs ──────────────────────────────────────────────────
router.get(
  '/billing/history',
  requirePermission('finance.billing.view'),
  financeController.getBillingHistory
);
 
router.get(
  '/billing/:id',
  requirePermission('finance.billing.view'),
  financeController.getBillingRun
);
 
router.post(
  '/billing/save',
  requirePermission('finance.billing.save'),
  financeController.saveBillingRun
);
 
router.delete(
  '/billing/:id',
  requirePermission('finance.billing.delete'),
  financeController.deleteBillingRun
);
 
export default router;
 