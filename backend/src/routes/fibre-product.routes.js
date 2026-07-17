import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/fibre-product.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
// requireAdmin = admin OR manager (elevated). Prefer requireStrictAdmin for admin-only.
import { requireTenantBranch } from '../middleware/tenant.js';
import { requireFibreOrderAccess } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';
import {
  createFibreProductSchema,
  updateFibreProductSchema,
} from '../schemas/fibre-product.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);
router.use(requireFibreOrderAccess);

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', requireAdmin, validate(createFibreProductSchema), createProduct);
router.put('/:id', requireAdmin, validate(updateFibreProductSchema), updateProduct);
router.delete('/:id', requireAdmin, deleteProduct);

export default router;
