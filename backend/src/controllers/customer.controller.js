import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Customer Controller - HTTP request/response for customers
 */
export class CustomerController {
  constructor(customerService = services.customer) {
    this.customerService = customerService;
  }

  getCustomers = asyncHandler(async (req, res) => {
    const archived = req.query.archived === 'true';
    const result = await this.customerService.getCustomers(req.tenantBranch, archived);
    res.json(result);
  });

  getCustomer = asyncHandler(async (req, res) => {
    const result = await this.customerService.getCustomer(req.params.id, req.tenantBranch);
    res.json(result);
  });

  createCustomer = asyncHandler(async (req, res) => {
    const result = await this.customerService.createCustomer({
      ...req.body,
      branch: req.tenantBranch,
    });
    res.status(201).json(result);
  });

  updateCustomer = asyncHandler(async (req, res) => {
    const { branch: _ignored, ...rest } = req.body;
    const result = await this.customerService.updateCustomer(req.params.id, rest, req.tenantBranch);
    res.json(result);
  });

  deleteCustomer = asyncHandler(async (req, res) => {
    const result = await this.customerService.deleteCustomer(req.params.id, req.tenantBranch);
    res.json(result);
  });

  archiveCustomer = asyncHandler(async (req, res) => {
    const isArchived = req.body.isArchived !== false;
    const result = await this.customerService.archiveCustomer(req.params.id, isArchived, req.tenantBranch);
    res.json(result);
  });
}

const controller = new CustomerController();
export const getCustomers = controller.getCustomers.bind(controller);
export const getCustomer = controller.getCustomer.bind(controller);
export const createCustomer = controller.createCustomer.bind(controller);
export const updateCustomer = controller.updateCustomer.bind(controller);
export const deleteCustomer = controller.deleteCustomer.bind(controller);
export const archiveCustomer = controller.archiveCustomer.bind(controller);
