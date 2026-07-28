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
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import {
  createFibreProductSchema,
  updateFibreProductSchema,
} from '../schemas/fibre-product.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);
router.use(requireFibreOrderAccess);

router.get('/', requirePermission('fibre_orders.access'), listProducts);
router.get('/:id', requirePermission('fibre_orders.access'), getProduct);
router.post(
  '/',
  requireAdmin,
  requirePermission('fibre_orders.products.manage'),
  validate(createFibreProductSchema),
  createProduct
);
router.put(
  '/:id',
  requireAdmin,
  requirePermission('fibre_orders.products.manage'),
  validate(updateFibreProductSchema),
  updateProduct
);
router.delete(
  '/:id',
  requireAdmin,
  requirePermission('fibre_orders.products.manage'),
  deleteProduct
);

export default router;
