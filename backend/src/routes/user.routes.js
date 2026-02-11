import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/auth.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../schemas/auth.schema.js';

const router = Router();

// All user routes require admin access
router.use(authenticate, requireAdmin);

router.get('/', getUsers);
router.post('/', validate(createUserSchema), createUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', deleteUser);

export default router;
