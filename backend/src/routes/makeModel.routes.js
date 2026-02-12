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
import { validate } from '../middleware/validate.js';
import { createMakeSchema, updateMakeSchema, createModelSchema, updateModelSchema } from '../schemas/makeModel.schema.js';

const router = Router();

router.use(authenticate);

// Read - all authenticated users (for machine form)
router.get('/makes', getMakes);
router.get('/models', getModels);

// Create/Update/Delete - admin only
router.post('/makes', requireAdmin, validate(createMakeSchema), createMake);
router.post('/makes/import', requireAdmin, importMakeModelParts);
router.put('/makes/:id', requireAdmin, validate(updateMakeSchema), updateMake);
router.delete('/makes/:id', requireAdmin, deleteMake);

router.post('/models', requireAdmin, validate(createModelSchema), createModel);
router.put('/models/:id', requireAdmin, validate(updateModelSchema), updateModel);
router.delete('/models/:id', requireAdmin, deleteModel);

export default router;
