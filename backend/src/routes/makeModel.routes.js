import { Router } from 'express';
import {
  getMakes,
  getModels,
  createMake,
  updateMake,
  deleteMake,
  createModel,
  updateModel,
  deleteModel,
} from '../controllers/makeModel.controller.js';
import { importMakeModelParts } from '../controllers/import.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
// requireAdmin = admin OR manager (elevated).
import { requireTenantBranch } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import { createMakeSchema, updateMakeSchema, createModelSchema, updateModelSchema } from '../schemas/makeModel.schema.js';

const router = Router();

/**
 * Auth + tenant only on /makes and /models handlers — not as pathless router.use().
 * This router is mounted at `/` so its pathless middleware previously ran for every
 * later /api/* route (roles, users, permissions, …) and blocked multi-branch callers.
 */
const withTenant = [authenticate, requireTenantBranch];

// Read - all authenticated users (for machine form)
router.get('/makes', ...withTenant, requirePermission('copiers.access'), getMakes);
router.get('/models', ...withTenant, requirePermission('copiers.access'), getModels);

// Create/Update/Delete - admin only
router.post(
  '/makes',
  ...withTenant,
  requireAdmin,
  requirePermission('copiers.catalog.makes_manage'),
  validate(createMakeSchema),
  createMake
);
router.post(
  '/makes/import',
  ...withTenant,
  requireAdmin,
  requirePermission('copiers.catalog.import'),
  importMakeModelParts
);
router.put(
  '/makes/:id',
  ...withTenant,
  requireAdmin,
  requirePermission('copiers.catalog.makes_manage'),
  validate(updateMakeSchema),
  updateMake
);
router.delete(
  '/makes/:id',
  ...withTenant,
  requireAdmin,
  requirePermission('copiers.catalog.makes_manage'),
  deleteMake
);

router.post(
  '/models',
  ...withTenant,
  requireAdmin,
  requirePermission('copiers.catalog.models_manage'),
  validate(createModelSchema),
  createModel
);
router.put(
  '/models/:id',
  ...withTenant,
  requireAdmin,
  requirePermission('copiers.catalog.models_manage'),
  validate(updateModelSchema),
  updateModel
);
router.delete(
  '/models/:id',
  ...withTenant,
  requireAdmin,
  requirePermission('copiers.catalog.models_manage'),
  deleteModel
);

export default router;
