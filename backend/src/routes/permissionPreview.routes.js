import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAnyPermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import { previewEffectivePermissionsSchema } from '../schemas/permissionPreview.schema.js';
import { getCatalog, preview } from '../controllers/permissionPreview.controller.js';

const router = Router();

router.use(
  authenticate,
  requireAnyPermission('users.manage_roles', 'users.manage_overrides')
);

router.get('/catalog', getCatalog);
router.post('/preview', validate(previewEffectivePermissionsSchema), preview);

export default router;
