import { BaseRepository } from './base.repository.js';

/**
 * ModelPart Repository - Handles data access for part definitions per model
 */
export class ModelPartRepository extends BaseRepository {
  constructor(prisma) {
    super('modelPart', prisma);
  }

  async findByModelId(modelId, branch = null) {
    const where = { modelId, isActive: true };
    if (branch) where.branch = branch;
    return this.findMany(where, {
      orderBy: [{ partType: 'asc' }, { partName: 'asc' }],
      include: { model: { include: { make: true } } },
    });
  }

  async findByModelAndPart(modelId, partName, branch) {
    const where = { modelId, partName, isActive: true };
    if (branch) where.branch = branch;
    return this.findOne(where);
  }
}
