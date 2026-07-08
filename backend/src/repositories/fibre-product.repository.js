import { BaseRepository } from './base.repository.js';

export class FibreProductRepository extends BaseRepository {
  constructor(prisma) {
    super('fibreProduct', prisma);
  }

  findActive() {
    return this.prisma.fibreProduct.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findAllIncludingInactive() {
    return this.prisma.fibreProduct.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  softDeactivate(id) {
    return this.prisma.fibreProduct.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
