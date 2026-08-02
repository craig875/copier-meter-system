import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import { updateRoleSchema } from '../schemas/role.schema.js';
import { listRoles, getRole, updateRole } from '../controllers/role.controller.js';

const router = Router();

router.use(authenticate, requirePermission('users.manage_roles'));

router.get('/', listRoles);
router.get('/:id', getRole);
router.put('/:id', validate(updateRoleSchema), updateRole);

export default router;
