import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import { upsertPermissionOverrideSchema } from '../schemas/permissionOverride.schema.js';
import {
  listOverrides,
  upsertOverride,
  deleteOverride,
} from '../controllers/permissionOverride.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requirePermission('users.manage_overrides'));

router.get('/', listOverrides);
router.put('/', validate(upsertPermissionOverrideSchema), upsertOverride);
router.delete('/:permissionKey', deleteOverride);

export default router;
