import { repositories } from '../repositories/index.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { assertRecordInTenant } from '../middleware/tenant.js';
import { hasAdminAccess } from '../utils/permissions.js';
import {
  installTaskStatusLabel,
  isForwardTaskStatus,
} from '../constants/install-task-statuses.js';

/**
 * Install sub-tasks — elevated CRUD; assignees may advance own status.
 */
export class InstallTaskService {
  constructor(repos = repositories) {
    this.taskRepo = repos.installTask;
    this.installRepo = repos.install;
  }

  async assertInstallInTenant(installId, tenantBranch) {
    const install = await this.installRepo.findByIdWithRelations(installId);
    if (!install) throw new NotFoundError('Installation');
    assertRecordInTenant(install, tenantBranch);
    return install;
  }

  async assertCanReadInstall(user, installId, tenantBranch) {
    const install = await this.assertInstallInTenant(installId, tenantBranch);
    if (hasAdminAccess(user?.role)) return install;
    const hit = await this.taskRepo.userHasTaskOnInstall(user.id, installId);
    if (!hit) throw new ForbiddenError('Access denied');
    return install;
  }

  async listTasks(user, installId, tenantBranch) {
    await this.assertCanReadInstall(user, installId, tenantBranch);
    return this.taskRepo.findByInstallId(installId);
  }

  async listMyTasks(user, tenantBranch) {
    return this.taskRepo.findByAssignee(user.id, { branch: tenantBranch });
  }

  async createTask(user, installId, data, tenantBranch) {
    if (!hasAdminAccess(user?.role)) {
      throw new ForbiddenError('Administrator or manager access required');
    }
    await this.assertInstallInTenant(installId, tenantBranch);

    const assignee = await this.findUser(data.assignedToId);
    if (!assignee) throw new ValidationError('Assignee user not found');

    return this.taskRepo.createTask({
      installId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      assignedToId: data.assignedToId,
      status: 'assigned',
      createdById: user.id,
    });
  }

  async findUser(id) {
    return repositories.user.findById(id);
  }

  async updateTask(user, installId, taskId, data, tenantBranch) {
    if (!hasAdminAccess(user?.role)) {
      throw new ForbiddenError('Administrator or manager access required');
    }
    await this.assertInstallInTenant(installId, tenantBranch);

    const existing = await this.taskRepo.findByIdWithRelations(taskId);
    if (!existing || existing.installId !== installId) {
      throw new NotFoundError('Task');
    }

    if (data.assignedToId) {
      const assignee = await this.findUser(data.assignedToId);
      if (!assignee) throw new ValidationError('Assignee user not found');
    }

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }
    if (data.assignedToId !== undefined) {
      // Reassignment keeps current status (product decision)
      updateData.assignedToId = data.assignedToId;
    }

    return this.taskRepo.updateTask(taskId, updateData);
  }

  async updateTaskStatus(user, installId, taskId, nextStatus, tenantBranch) {
    await this.assertInstallInTenant(installId, tenantBranch);

    const existing = await this.taskRepo.findByIdWithRelations(taskId);
    if (!existing || existing.installId !== installId) {
      throw new NotFoundError('Task');
    }

    const elevated = hasAdminAccess(user?.role);
    if (!elevated && existing.assignedToId !== user.id) {
      throw new ForbiddenError('You can only update tasks assigned to you');
    }

    if (nextStatus === existing.status) {
      return existing;
    }

    if (!isForwardTaskStatus(existing.status, nextStatus)) {
      throw new ValidationError(
        `Cannot change status from ${installTaskStatusLabel(existing.status)} to ${installTaskStatusLabel(nextStatus)}`
      );
    }

    const now = new Date();
    const updateData = { status: nextStatus };
    if (nextStatus === 'acknowledged' && !existing.acknowledgedAt) {
      updateData.acknowledgedAt = now;
    }
    if (nextStatus === 'complete') {
      if (!existing.acknowledgedAt) updateData.acknowledgedAt = now;
      updateData.completedAt = now;
    }

    const updated = await this.taskRepo.updateTask(taskId, updateData);

    const actorName = user.name || user.email || 'User';
    const assigneeName = existing.assignedTo?.name || 'assignee';
    await this.installRepo.createUpdate({
      installId,
      previousStatus: null,
      newStatus: null,
      previousProgress: null,
      newProgress: null,
      note: `Task "${existing.title}" (${assigneeName}): ${installTaskStatusLabel(existing.status)} → ${installTaskStatusLabel(nextStatus)} — by ${actorName}`,
      createdById: user.id,
    });

    return updated;
  }

  async deleteTask(user, installId, taskId, tenantBranch) {
    if (!hasAdminAccess(user?.role)) {
      throw new ForbiddenError('Administrator or manager access required');
    }
    await this.assertInstallInTenant(installId, tenantBranch);

    const existing = await this.taskRepo.findByIdWithRelations(taskId);
    if (!existing || existing.installId !== installId) {
      throw new NotFoundError('Task');
    }

    await this.taskRepo.deleteTask(taskId);
    return { ok: true };
  }
}
