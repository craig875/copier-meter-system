import { BaseRepository } from './base.repository.js';

export class FibreProductRepository extends BaseRepository {
  constructor(prisma) {
    super('fibreProduct', prisma);
  }

  findActive(branch) {
    return this.prisma.fibreProduct.findMany({
      where: {
        isActive: true,
        ...(branch ? { branch } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findAllIncludingInactive(branch) {
    return this.prisma.fibreProduct.findMany({
      where: branch ? { branch } : {},
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
