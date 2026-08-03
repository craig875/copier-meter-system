import { repositories } from '../repositories/index.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { assertRecordInTenant } from '../middleware/tenant.js';
import { userHasPermission } from '../middleware/requirePermission.js';
import {
  installTaskStatusLabel,
  isForwardTaskStatus,
} from '../constants/install-task-statuses.js';
import { emailService } from '../connectivity/alerting/nodemailer.impl.js';
import { config } from '../config/index.js';

/**
 * Install sub-tasks — manage CRUD; assignees may advance own status.
 */
export class InstallTaskService {
  constructor(repos = repositories, notificationService = null) {
    this.taskRepo = repos.installTask;
    this.installRepo = repos.install;
    this.notificationService = notificationService;
  }

  async assertInstallInTenant(installId, tenantBranch) {
    const install = await this.installRepo.findByIdWithRelations(installId);
    if (!install) throw new NotFoundError('Installation');
    assertRecordInTenant(install, tenantBranch);
    return install;
  }

  async assertCanReadInstall(user, installId, tenantBranch) {
    const install = await this.assertInstallInTenant(installId, tenantBranch);
    if (userHasPermission(user, 'installations.view')) return install;
    if (!userHasPermission(user, 'installations.tasks.view_own')) {
      throw new ForbiddenError('Access denied');
    }
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
    if (!userHasPermission(user, 'installations.tasks.manage')) {
      throw new ForbiddenError('Permission denied');
    }
    const install = await this.assertInstallInTenant(installId, tenantBranch);

    const assignee = await this.findUser(data.assignedToId);
    if (!assignee) throw new ValidationError('Assignee user not found');

    const task = await this.taskRepo.createTask({
      installId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      assignedToId: data.assignedToId,
      status: 'assigned',
      createdById: user.id,
    });

    this.queueAssignmentNotify({
      task,
      install,
      assignee,
      assignedByName: user.name || user.email || 'A user',
    });

    return task;
  }

  async findUser(id) {
    return repositories.user.findById(id);
  }

  async updateTask(user, installId, taskId, data, tenantBranch) {
    if (!userHasPermission(user, 'installations.tasks.manage')) {
      throw new ForbiddenError('Permission denied');
    }
    const install = await this.assertInstallInTenant(installId, tenantBranch);

    const existing = await this.taskRepo.findByIdWithRelations(taskId);
    if (!existing || existing.installId !== installId) {
      throw new NotFoundError('Task');
    }

    let newAssignee = null;
    if (data.assignedToId !== undefined) {
      newAssignee = await this.findUser(data.assignedToId);
      if (!newAssignee) throw new ValidationError('Assignee user not found');
    }

    const previousAssigneeId = existing.assignedToId;
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }
    if (data.assignedToId !== undefined) {
      // Reassignment keeps current status (product decision)
      updateData.assignedToId = data.assignedToId;
    }

    const updated = await this.taskRepo.updateTask(taskId, updateData);

    if (
      data.assignedToId !== undefined &&
      data.assignedToId !== previousAssigneeId &&
      newAssignee
    ) {
      this.queueAssignmentNotify({
        task: updated,
        install,
        assignee: newAssignee,
        assignedByName: user.name || user.email || 'A user',
      });
    }

    return updated;
  }

  /**
   * Fire-and-forget in-app + email notify for a newly assigned user.
   * Failures are logged only — never affect the API response.
   */
  queueAssignmentNotify({ task, install, assignee, assignedByName }) {
    void this.dispatchAssignmentNotify({
      task,
      install,
      assignee,
      assignedByName,
    }).catch((err) => {
      console.error('Install task assignment notify error:', err);
    });
  }

  async dispatchAssignmentNotify({ task, install, assignee, assignedByName }) {
    const payload = {
      assigneeUserId: assignee.id,
      branch: install.branch,
      taskId: task.id,
      taskTitle: task.title,
      installId: install.id,
      customerName: install.customerName,
      siteName: install.siteName || null,
      assignedByName,
    };

    if (this.notificationService) {
      try {
        await this.notificationService.notifyInstallTaskAssigned(payload);
      } catch (err) {
        console.error('Install task in-app notification failed:', err);
      }
    }

    try {
      await this.sendAssignmentEmail({
        to: assignee.email,
        taskTitle: task.title,
        customerName: install.customerName,
        siteName: install.siteName || null,
        assignedByName,
        installId: install.id,
      });
    } catch (err) {
      console.error('Install task assignment email failed:', err);
    }
  }

  async sendAssignmentEmail({
    to,
    taskTitle,
    customerName,
    siteName,
    assignedByName,
    installId,
  }) {
    if (!to) {
      console.warn('Install task assignment email: assignee has no email address');
      return;
    }

    const location = siteName
      ? `${customerName} (${siteName})`
      : customerName || 'an installation';
    const base = (config.frontendUrl || '').replace(/\/$/, '');
    const openUrl = base
      ? `${base}/installations/${installId}`
      : `/installations/${installId}`;

    const subject = `[Installations] Task assigned: ${taskTitle}`;
    const text = [
      `You were assigned a task: ${taskTitle}`,
      `Installation: ${location}`,
      `Assigned by: ${assignedByName}`,
      `Open: ${openUrl}`,
    ].join('\n');
    const html = `
      <p>You were assigned a task: <strong>${escapeHtml(taskTitle)}</strong></p>
      <p>Installation: <strong>${escapeHtml(location)}</strong></p>
      <p>Assigned by: ${escapeHtml(assignedByName)}</p>
      <p><a href="${escapeHtml(openUrl)}">Open installation</a></p>
    `;

    // Soft-skip when SMTP unset — same as connectivity alert.service.js
    await emailService.send({ to, subject, html, text });
  }

  async updateTaskStatus(user, installId, taskId, nextStatus, tenantBranch) {
    await this.assertInstallInTenant(installId, tenantBranch);

    const existing = await this.taskRepo.findByIdWithRelations(taskId);
    if (!existing || existing.installId !== installId) {
      throw new NotFoundError('Task');
    }

    const canManageStatus =
      userHasPermission(user, 'installations.tasks.update_status') &&
      userHasPermission(user, 'installations.view');
    const isAssignee =
      userHasPermission(user, 'installations.tasks.update_status') &&
      existing.assignedToId === user.id;

    if (!canManageStatus && !isAssignee) {
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
    if (!userHasPermission(user, 'installations.tasks.manage')) {
      throw new ForbiddenError('Permission denied');
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
