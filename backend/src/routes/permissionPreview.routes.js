import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAnyPermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import { previewEffectivePermissionsSchema } from '../schemas/permissionPreview.schema.js';
import { preview } from '../controllers/permissionPreview.controller.js';

const router = Router();

router.use(
  authenticate,
  requireAnyPermission('users.manage_roles', 'users.manage_overrides')
);

router.post('/preview', validate(previewEffectivePermissionsSchema), preview);

export default router;
