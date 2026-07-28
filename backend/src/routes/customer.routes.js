import { Router } from 'express';
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, archiveCustomer } from '../controllers/customer.controller.js';
import { importCustomers } from '../controllers/import.controller.js';
import { authenticate, requireAdmin, requireMeterOrAdmin } from '../middleware/auth.js';
// requireAdmin = admin OR manager (elevated). Prefer requireStrictAdmin for admin-only.
import { requireTenantBranch } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { createCustomerSchema, updateCustomerSchema, customerListQuerySchema } from '../schemas/customer.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);

// Bulk customer import CSV (customers only; admin/manager)
router.post(
  '/import',
  requireAdmin,
  requirePermission('copiers.customers.import'),
  importCustomers
);

// List and view - any user with meter/consumables access
router.get(
  '/',
  requirePermission('copiers.customers.view'),
  validateQuery(customerListQuerySchema),
  getCustomers
);
router.get('/:id', requirePermission('copiers.customers.view'), getCustomer);
router.post(
  '/',
  requireAdmin,
  requirePermission('copiers.customers.create'),
  validate(createCustomerSchema),
  createCustomer
);
router.put(
  '/:id',
  requireAdmin,
  requirePermission('copiers.customers.update'),
  validate(updateCustomerSchema),
  updateCustomer
);
router.patch(
  '/:id/archive',
  requireMeterOrAdmin,
  requirePermission('copiers.customers.archive'),
  archiveCustomer
);
router.delete(
  '/:id',
  requireAdmin,
  requirePermission('copiers.customers.delete'),
  deleteCustomer
);

export default router;
