import { Router } from 'express';
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, archiveCustomer } from '../controllers/customer.controller.js';
import { authenticate, requireAdmin, requireMeterOrAdmin } from '../middleware/auth.js';
import { requireMeterReadingAccess } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';
import { createCustomerSchema, updateCustomerSchema } from '../schemas/customer.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireMeterReadingAccess);

// List and view - any user with meter/consumables access
router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', requireAdmin, validate(createCustomerSchema), createCustomer);
router.put('/:id', requireAdmin, validate(updateCustomerSchema), updateCustomer);
router.patch('/:id/archive', requireMeterOrAdmin, archiveCustomer);
router.delete('/:id', requireAdmin, deleteCustomer);

export default router;
