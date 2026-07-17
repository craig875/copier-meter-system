import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requireTenantBranch } from '../middleware/tenant.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  createInstallSchema,
  updateInstallSchema,
  installListQuerySchema,
} from '../schemas/install.schema.js';
import {
  createInstallTaskSchema,
  updateInstallTaskSchema,
  updateInstallTaskStatusSchema,
} from '../schemas/install-task.schema.js';
import {
  requireElevatedOrInstallTaskAssignee,
  requireElevatedOrInstallAssignee,
} from '../middleware/requireElevatedOrInstallTaskAssignee.js';
import {
  listInstallTypes,
  listInstalls,
  getInstall,
  getInstallUpdates,
  createInstall,
  updateInstall,
} from '../controllers/install.controller.js';
import {
  listMyInstallTasks,
  listInstallTasks,
  createInstallTask,
  updateInstallTask,
  updateInstallTaskStatus,
  deleteInstallTask,
} from '../controllers/install-task.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);

// Assignee inbox — any authenticated user (tenant-scoped)
router.get('/my-tasks', listMyInstallTasks);

// Elevated-only catalog / list / create
router.get('/types', requireAdmin, listInstallTypes);
router.get('/', requireAdmin, validateQuery(installListQuerySchema), listInstalls);
router.post('/', requireAdmin, validate(createInstallSchema), createInstall);

// Tasks nested under install
router.get('/:id/tasks', requireElevatedOrInstallAssignee, listInstallTasks);
router.post(
  '/:id/tasks',
  requireAdmin,
  validate(createInstallTaskSchema),
  createInstallTask
);
router.put(
  '/:id/tasks/:taskId',
  requireAdmin,
  validate(updateInstallTaskSchema),
  updateInstallTask
);
router.patch(
  '/:id/tasks/:taskId/status',
  requireElevatedOrInstallTaskAssignee,
  validate(updateInstallTaskStatusSchema),
  updateInstallTaskStatus
);
router.delete('/:id/tasks/:taskId', requireAdmin, deleteInstallTask);

// Install read: elevated OR assignee on this install (R1)
router.get('/:id/updates', requireElevatedOrInstallAssignee, getInstallUpdates);
router.get('/:id', requireElevatedOrInstallAssignee, getInstall);

// Install mutate: elevated only
router.put('/:id', requireAdmin, validate(updateInstallSchema), updateInstall);

export default router;
