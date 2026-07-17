import { hasAdminAccess } from '../utils/permissions.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { assertRecordInTenant } from './tenant.js';
import { repositories } from '../repositories/index.js';

/**
 * Status-update gate: elevated (admin/manager) OR assignee of this task.
 * Loads task onto req.installTask; asserts install is in tenant branch.
 */
export function requireElevatedOrInstallTaskAssignee(req, res, next) {
  return (async () => {
    if (hasAdminAccess(req.user?.role)) {
      return next();
    }

    const taskId = req.params.taskId;
    if (!taskId) {
      return next(new ForbiddenError('Task access required'));
    }

    const task = await repositories.installTask.findByIdWithRelations(taskId);
    if (!task || task.installId !== req.params.id) {
      return next(new NotFoundError('Task'));
    }

    try {
      assertRecordInTenant(task.install, req.tenantBranch, 'Task');
    } catch (err) {
      return next(err);
    }

    if (task.assignedToId !== req.user?.id) {
      return next(new ForbiddenError('You can only update tasks assigned to you'));
    }

    req.installTask = task;
    return next();
  })().catch(next);
}

/**
 * Read gate for an install: elevated OR has at least one task on this install.
 */
export function requireElevatedOrInstallAssignee(req, res, next) {
  return (async () => {
    if (hasAdminAccess(req.user?.role)) {
      return next();
    }

    const installId = req.params.id;
    if (!installId || !req.user?.id) {
      return next(new ForbiddenError('Access denied'));
    }

    const hit = await repositories.installTask.userHasTaskOnInstall(
      req.user.id,
      installId
    );
    if (!hit) {
      return next(new ForbiddenError('Access denied'));
    }

    return next();
  })().catch(next);
}
