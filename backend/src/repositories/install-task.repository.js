import { BaseRepository } from './base.repository.js';

const taskInclude = {
  assignedTo: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};

const taskWithInstallInclude = {
  ...taskInclude,
  install: {
    select: {
      id: true,
      branch: true,
      customerName: true,
      siteName: true,
      status: true,
      salesOrderNumber: true,
    },
  },
};

export class InstallTaskRepository extends BaseRepository {
  constructor(prisma) {
    super('installTask', prisma);
  }

  findByIdWithRelations(id) {
    return this.prisma.installTask.findUnique({
      where: { id },
      include: {
        ...taskInclude,
        install: { select: { id: true, branch: true, customerName: true } },
      },
    });
  }

  findByInstallId(installId) {
    return this.prisma.installTask.findMany({
      where: { installId },
      include: taskInclude,
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  findByAssignee(assignedToId, { branch } = {}) {
    return this.prisma.installTask.findMany({
      where: {
        assignedToId,
        ...(branch ? { install: { branch } } : {}),
      },
      include: taskWithInstallInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  userHasTaskOnInstall(userId, installId) {
    return this.prisma.installTask.findFirst({
      where: { installId, assignedToId: userId },
      select: { id: true },
    });
  }

  createTask(data) {
    return this.prisma.installTask.create({
      data,
      include: taskInclude,
    });
  }

  updateTask(id, data) {
    return this.prisma.installTask.update({
      where: { id },
      data,
      include: taskInclude,
    });
  }

  deleteTask(id) {
    return this.prisma.installTask.delete({ where: { id } });
  }
}
