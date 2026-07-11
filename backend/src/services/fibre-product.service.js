import { repositories } from '../repositories/index.js';
import { assertRecordInTenant } from '../middleware/tenant.js';

/**
 * Fibre Product Service - product catalogue for fibre orders (tenant-scoped)
 */
export class FibreProductService {
  constructor(repos = repositories) {
    this.productRepo = repos.fibreProduct;
  }

  list(tenantBranch, activeOnly = true) {
    return activeOnly
      ? this.productRepo.findActive(tenantBranch)
      : this.productRepo.findAllIncludingInactive(tenantBranch);
  }

  async getById(id, tenantBranch) {
    const product = await this.productRepo.findById(id);
    assertRecordInTenant(product, tenantBranch, 'Fibre product');
    return product;
  }

  create(data, tenantBranch) {
    const { branch: _ignored, ...rest } = data;
    return this.productRepo.create({
      name: rest.name,
      productType: rest.productType,
      defaultEtaWeeks: rest.defaultEtaWeeks,
      notes: rest.notes ?? null,
      branch: tenantBranch,
    });
  }

  async update(id, data, tenantBranch) {
    await this.getById(id, tenantBranch);
    const { branch: _ignored, ...rest } = data;
    return this.productRepo.update(id, rest);
  }

  async deactivate(id, tenantBranch) {
    const product = await this.getById(id, tenantBranch);
    if (!product.isActive) return product;
    return this.productRepo.softDeactivate(id);
  }
}
