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
// requireAdmin = admin OR manager (elevated). Prefer requireStrictAdmin for admin-only.
import { requireTenantBranch } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import { createMakeSchema, updateMakeSchema, createModelSchema, updateModelSchema } from '../schemas/makeModel.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);

// Read - all authenticated users (for machine form)
router.get('/makes', requirePermission('copiers.access'), getMakes);
router.get('/models', requirePermission('copiers.access'), getModels);

// Create/Update/Delete - admin only
router.post(
  '/makes',
  requireAdmin,
  requirePermission('copiers.catalog.makes_manage'),
  validate(createMakeSchema),
  createMake
);
router.post(
  '/makes/import',
  requireAdmin,
  requirePermission('copiers.catalog.import'),
  importMakeModelParts
);
router.put(
  '/makes/:id',
  requireAdmin,
  requirePermission('copiers.catalog.makes_manage'),
  validate(updateMakeSchema),
  updateMake
);
router.delete(
  '/makes/:id',
  requireAdmin,
  requirePermission('copiers.catalog.makes_manage'),
  deleteMake
);

router.post(
  '/models',
  requireAdmin,
  requirePermission('copiers.catalog.models_manage'),
  validate(createModelSchema),
  createModel
);
router.put(
  '/models/:id',
  requireAdmin,
  requirePermission('copiers.catalog.models_manage'),
  validate(updateModelSchema),
  updateModel
);
router.delete(
  '/models/:id',
  requireAdmin,
  requirePermission('copiers.catalog.models_manage'),
  deleteModel
);

export default router;
