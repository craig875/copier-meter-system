import { Router } from 'express';
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, archiveCustomer } from '../controllers/customer.controller.js';
import { importCustomers } from '../controllers/import.controller.js';
import { authenticate, requireAdmin, requireMeterOrAdmin } from '../middleware/auth.js';
// requireAdmin = admin OR manager (elevated). Prefer requireStrictAdmin for admin-only.
import { requireTenantBranch } from '../middleware/tenant.js';
import { requireCustomerAccess } from '../middleware/permissions.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { createCustomerSchema, updateCustomerSchema, customerListQuerySchema } from '../schemas/customer.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantBranch);
router.use(requireCustomerAccess);

// Bulk customer import CSV (customers only; admin/manager)
router.post('/import', requireAdmin, importCustomers);

// List and view - any user with meter/consumables access
router.get('/', validateQuery(customerListQuerySchema), getCustomers);
router.get('/:id', getCustomer);
router.post('/', requireAdmin, validate(createCustomerSchema), createCustomer);
router.put('/:id', requireAdmin, validate(updateCustomerSchema), updateCustomer);
router.patch('/:id/archive', requireMeterOrAdmin, archiveCustomer);
router.delete('/:id', requireAdmin, deleteCustomer);

export default router;
