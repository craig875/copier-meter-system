import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class FibreProductController {
  constructor(fibreProductService = services.fibreProduct) {
    this.fibreProductService = fibreProductService;
  }

  listProducts = asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true' && ['admin', 'manager'].includes(req.user?.role);
    const products = await this.fibreProductService.list(!includeInactive);
    res.json({ products });
  });

  getProduct = asyncHandler(async (req, res) => {
    const product = await this.fibreProductService.getById(req.params.id);
    res.json({ product });
  });

  createProduct = asyncHandler(async (req, res) => {
    const product = await this.fibreProductService.create(req.body);
    res.status(201).json({ product });
  });

  updateProduct = asyncHandler(async (req, res) => {
    const product = await this.fibreProductService.update(req.params.id, req.body);
    res.json({ product });
  });

  deleteProduct = asyncHandler(async (req, res) => {
    const product = await this.fibreProductService.deactivate(req.params.id);
    res.json({ product });
  });
}

const controller = new FibreProductController();
export const listProducts = controller.listProducts.bind(controller);
export const getProduct = controller.getProduct.bind(controller);
export const createProduct = controller.createProduct.bind(controller);
export const updateProduct = controller.updateProduct.bind(controller);
export const deleteProduct = controller.deleteProduct.bind(controller);
