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
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requireMeterReadingAccess } from '../middleware/permissions.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { createMachineSchema, updateMachineSchema, machineQuerySchema } from '../schemas/machine.schema.js';

const router = Router();

// All machine routes require authentication and meter reading access
router.use(authenticate);
router.use(requireMeterReadingAccess);

router.get('/', validateQuery(machineQuerySchema), getMachines);
router.get('/:id', getMachine);

// Create / update / archive allowed for any authenticated user
router.post('/', validate(createMachineSchema), createMachine);
router.put('/:id', validate(updateMachineSchema), updateMachine);
router.post('/:id/decommission', decommissionMachine);

// Admin only routes
router.post('/import', requireAdmin, importMachines);
router.post('/:id/recommission', requireAdmin, recommissionMachine);
router.delete('/:id', requireAdmin, deleteMachine);

export default router;
