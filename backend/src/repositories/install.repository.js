import { BaseRepository } from './base.repository.js';

const installInclude = {
  type: true,
  createdBy: { select: { id: true, name: true, email: true } },
  documents: {
    orderBy: { createdAt: 'asc' },
  },
  tasks: {
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
};

export class InstallRepository extends BaseRepository {
  constructor(prisma) {
    super('install', prisma);
  }

  findByIdWithRelations(id) {
    return this.prisma.install.findUnique({
      where: { id },
      include: installInclude,
    });
  }

  findManyWithRelations(where = {}, options = {}) {
    return this.prisma.install.findMany({
      where,
      include: installInclude,
      orderBy: options.orderBy ?? { updatedAt: 'desc' },
      ...options,
    });
  }

  findUpdates(installId) {
    return this.prisma.installUpdate.findMany({
      where: { installId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  createUpdate(data) {
    return this.prisma.installUpdate.create({ data });
  }

  findActiveTypes() {
    return this.prisma.installType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findTypeById(id) {
    return this.prisma.installType.findUnique({ where: { id } });
  }

  async getSalesOrderUrlTemplate() {
    const row = await this.prisma.appSetting.findUnique({
      where: { key: 'accounting.sales_order_url_template' },
    });
    return row?.value ?? null;
  }

  upsertPrimaryDocument(installId, { url, label, createdById }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.installDocument.findFirst({
        where: { installId, kind: 'LINK' },
        orderBy: { createdAt: 'asc' },
      });
      if (!url) {
        if (existing) {
          await tx.installDocument.delete({ where: { id: existing.id } });
        }
        return null;
      }
      if (existing) {
        return tx.installDocument.update({
          where: { id: existing.id },
          data: {
            url,
            label: label ?? existing.label ?? 'Documents',
          },
        });
      }
      return tx.installDocument.create({
        data: {
          installId,
          kind: 'LINK',
          url,
          label: label || 'Documents',
          createdById,
        },
      });
    });
  }
}
