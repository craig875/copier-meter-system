import { ForbiddenError, NotFoundError } from '../utils/errors.js';

const VALID_BRANCHES = new Set(['JHB', 'CT']);

/**
 * Normalize a branch value to JHB|CT or null.
 * @param {unknown} value
 * @returns {'JHB'|'CT'|null}
 */
export function normalizeBranch(value) {
  if (value == null || value === '') return null;
  const b = String(value).toUpperCase();
  return VALID_BRANCHES.has(b) ? b : null;
}

/**
 * After authenticate: require user.branch and attach req.tenantBranch.
 * Does not mutate req.body.branch (user-admin create/update still sets another user's home branch).
 */
export function requireTenantBranch(req, res, next) {
  const branch = normalizeBranch(req.user?.branch);
  if (!branch) {
    return next(new ForbiddenError('User has no branch assigned'));
  }
  req.tenantBranch = branch;
  next();
}

/**
 * Tenant ownership check for get-by-id / mutate-by-id.
 * Returns 404 (via NotFoundError) so cross-branch existence is not revealed.
 * @param {{ branch?: string } | null | undefined} record
 * @param {string} tenantBranch
 * @param {string} [resourceName]
 */
export function assertRecordInTenant(record, tenantBranch, resourceName = 'Resource') {
  if (!record || normalizeBranch(record.branch) !== normalizeBranch(tenantBranch)) {
    throw new NotFoundError(resourceName);
  }
}
