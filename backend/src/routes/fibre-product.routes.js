import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/fibre-product.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenantBranch } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate } from '../middleware/validate.js';
import {
  createFibreProductSchema,
  updateFibreProductSchema,
} from '../schemas/fibre-product.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);

router.get('/', requirePermission('fibre_orders.access'), listProducts);
router.get('/:id', requirePermission('fibre_orders.access'), getProduct);
router.post(
  '/',
  requirePermission('fibre_orders.products.manage'),
  validate(createFibreProductSchema),
  createProduct
);
router.put(
  '/:id',
  requirePermission('fibre_orders.products.manage'),
  validate(updateFibreProductSchema),
  updateProduct
);
router.delete(
  '/:id',
  requirePermission('fibre_orders.products.manage'),
  deleteProduct
);

export default router;
