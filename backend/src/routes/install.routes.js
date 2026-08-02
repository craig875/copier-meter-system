import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
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
  requireInstallTaskStatusAccess,
  requireInstallViewOrAssignee,
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

router.get(
  '/my-tasks',
  requirePermission('installations.tasks.view_own'),
  listMyInstallTasks
);

router.get('/types', requirePermission('installations.view'), listInstallTypes);
router.get(
  '/',
  requirePermission('installations.view'),
  validateQuery(installListQuerySchema),
  listInstalls
);
router.post('/', requirePermission('installations.create'), validate(createInstallSchema), createInstall);

router.get('/:id/tasks', requireInstallViewOrAssignee, listInstallTasks);
router.post(
  '/:id/tasks',
  requirePermission('installations.tasks.manage'),
  validate(createInstallTaskSchema),
  createInstallTask
);
router.put(
  '/:id/tasks/:taskId',
  requirePermission('installations.tasks.manage'),
  validate(updateInstallTaskSchema),
  updateInstallTask
);
router.patch(
  '/:id/tasks/:taskId/status',
  requireInstallTaskStatusAccess,
  validate(updateInstallTaskStatusSchema),
  updateInstallTaskStatus
);
router.delete(
  '/:id/tasks/:taskId',
  requirePermission('installations.tasks.manage'),
  deleteInstallTask
);

router.get('/:id/updates', requireInstallViewOrAssignee, getInstallUpdates);
router.get('/:id', requireInstallViewOrAssignee, getInstall);

router.put(
  '/:id',
  requirePermission('installations.update'),
  validate(updateInstallSchema),
  updateInstall
);

export default router;
