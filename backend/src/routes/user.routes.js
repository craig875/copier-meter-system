import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/auth.controller.js';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
} from '../controllers/user-notification-preferences.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../schemas/auth.schema.js';
import { updateNotificationPreferencesSchema } from '../schemas/user-notification-preferences.schema.js';

const router = Router();

router.use(authenticate);

// Self-service or admin-on-behalf (not behind requireAdmin).
router.get('/:id/notification-preferences', getUserNotificationPreferences);
router.patch(
  '/:id/notification-preferences',
  validate(updateNotificationPreferencesSchema),
  updateUserNotificationPreferences
);

// requireAdmin = admin OR manager (elevated).
router.use(requireAdmin);

router.get('/', getUsers);
router.post('/', validate(createUserSchema), createUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', deleteUser);

export default router;
