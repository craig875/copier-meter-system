import { repositories } from '../repositories/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Fibre Product Service - product catalogue for fibre orders
 */
export class FibreProductService {
  constructor(repos = repositories) {
    this.productRepo = repos.fibreProduct;
  }

  list(activeOnly = true) {
    return activeOnly
      ? this.productRepo.findActive()
      : this.productRepo.findAllIncludingInactive();
  }

  async getById(id) {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundError('Fibre product');
    return product;
  }

  create(data) {
    return this.productRepo.create({
      name: data.name,
      productType: data.productType,
      defaultEtaWeeks: data.defaultEtaWeeks,
      notes: data.notes ?? null,
    });
  }

  async update(id, data) {
    await this.getById(id);
    return this.productRepo.update(id, data);
  }

  async deactivate(id) {
    const product = await this.getById(id);
    if (!product.isActive) return product;
    return this.productRepo.softDeactivate(id);
  }
}
