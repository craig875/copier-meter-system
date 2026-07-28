import { Router } from 'express';
import {
  getMachines,
  getMachine,
  createMachine,
  updateMachine,
  deleteMachine,
  decommissionMachine,
  recommissionMachine,
} from '../controllers/machine.controller.js';
import { importMachines } from '../controllers/import.controller.js';
import { authenticate, requireAdmin, requireMeterUserOrAdmin } from '../middleware/auth.js';
// requireAdmin = admin OR manager (elevated). Prefer requireStrictAdmin for admin-only.
import { requireTenantBranch } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { createMachineSchema, updateMachineSchema, machineQuerySchema } from '../schemas/machine.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);

router.get(
  '/',
  requirePermission('copiers.machines.view'),
  validateQuery(machineQuerySchema),
  getMachines
);
router.get('/:id', requirePermission('copiers.machines.view'), getMachine);

// Create / update / archive - meter user or admin (capturer can only read)
router.post(
  '/',
  requireMeterUserOrAdmin,
  requirePermission('copiers.machines.create'),
  validate(createMachineSchema),
  createMachine
);
router.put(
  '/:id',
  requireMeterUserOrAdmin,
  requirePermission('copiers.machines.update'),
  validate(updateMachineSchema),
  updateMachine
);
router.post(
  '/:id/decommission',
  requireMeterUserOrAdmin,
  requirePermission('copiers.machines.decommission'),
  decommissionMachine
);

// Admin only routes
router.post(
  '/import',
  requireAdmin,
  requirePermission('copiers.machines.import'),
  importMachines
);
router.post(
  '/:id/recommission',
  requireMeterUserOrAdmin,
  requirePermission('copiers.machines.recommission'),
  recommissionMachine
);
router.delete(
  '/:id',
  requireAdmin,
  requirePermission('copiers.machines.delete'),
  deleteMachine
);

export default router;
