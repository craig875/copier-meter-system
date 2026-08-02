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
import { authenticate } from '../middleware/auth.js';
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

router.post(
  '/',
  requirePermission('copiers.machines.create'),
  validate(createMachineSchema),
  createMachine
);
router.put(
  '/:id',
  requirePermission('copiers.machines.update'),
  validate(updateMachineSchema),
  updateMachine
);
router.post(
  '/:id/decommission',
  requirePermission('copiers.machines.decommission'),
  decommissionMachine
);

router.post(
  '/import',
  requirePermission('copiers.machines.import'),
  importMachines
);
router.post(
  '/:id/recommission',
  requirePermission('copiers.machines.recommission'),
  recommissionMachine
);
router.delete(
  '/:id',
  requirePermission('copiers.machines.delete'),
  deleteMachine
);

export default router;
