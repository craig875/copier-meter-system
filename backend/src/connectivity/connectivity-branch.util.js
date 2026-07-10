import { NotFoundError } from '../utils/errors.js';
import { normalizeBranch } from '../middleware/tenant.js';

/**
 * @deprecated Prefer req.tenantBranch from requireTenantBranch middleware.
 * Kept only for any leftover call sites during migration.
 */
export function resolveConnectivityBranch(req) {
  return normalizeBranch(req.tenantBranch) || normalizeBranch(req.user?.branch) || 'JHB';
}

/**
 * Tenant ownership check for monitoring targets — 404 so cross-branch existence is not revealed.
 */
export function assertTargetInBranch(target, branch) {
  if (!target || normalizeBranch(target.branch) !== normalizeBranch(branch)) {
    throw new NotFoundError('Monitoring target');
  }
}
