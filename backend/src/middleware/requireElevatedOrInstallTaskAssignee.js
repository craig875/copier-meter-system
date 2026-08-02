import { userHasPermission } from './requirePermission.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { assertRecordInTenant } from './tenant.js';
import { repositories } from '../repositories/index.js';

/**
 * Read gate: installations.view OR (view_own + has a task on this install).
 */
export function requireInstallViewOrAssignee(req, res, next) {
  return (async () => {
    if (userHasPermission(req.user, 'installations.view')) {
      return next();
    }

    const installId = req.params.id;
    if (!installId || !req.user?.id) {
      return next(new ForbiddenError('Access denied'));
    }

    if (!userHasPermission(req.user, 'installations.tasks.view_own')) {
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

/**
 * Status-update gate: (update_status + view) OR (update_status + assignee of this task).
 * Loads task onto req.installTask; asserts install is in tenant branch.
 */
export function requireInstallTaskStatusAccess(req, res, next) {
  return (async () => {
    if (
      userHasPermission(req.user, 'installations.tasks.update_status') &&
      userHasPermission(req.user, 'installations.view')
    ) {
      return next();
    }

    const taskId = req.params.taskId;
    if (!taskId) {
      return next(new ForbiddenError('Task access required'));
    }

    if (!userHasPermission(req.user, 'installations.tasks.update_status')) {
      return next(new ForbiddenError('Permission denied'));
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

/** @deprecated Use requireInstallViewOrAssignee */
export const requireElevatedOrInstallAssignee = requireInstallViewOrAssignee;
/** @deprecated Use requireInstallTaskStatusAccess */
export const requireElevatedOrInstallTaskAssignee = requireInstallTaskStatusAccess;
