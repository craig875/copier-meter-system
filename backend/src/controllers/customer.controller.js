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
    const branch = req.query.branch || req.user?.branch || null;
    const result = await this.customerService.getCustomers(branch);
    res.json(result);
  });

  getCustomer = asyncHandler(async (req, res) => {
    const result = await this.customerService.getCustomer(req.params.id);
    res.json(result);
  });

  createCustomer = asyncHandler(async (req, res) => {
    const result = await this.customerService.createCustomer(req.body);
    res.status(201).json(result);
  });

  updateCustomer = asyncHandler(async (req, res) => {
    const result = await this.customerService.updateCustomer(req.params.id, req.body);
    res.json(result);
  });

  deleteCustomer = asyncHandler(async (req, res) => {
    const result = await this.customerService.deleteCustomer(req.params.id);
    res.json(result);
  });

  archiveCustomer = asyncHandler(async (req, res) => {
    const isArchived = req.body.isArchived !== false;
    const result = await this.customerService.archiveCustomer(req.params.id, isArchived);
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
