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
 * After authenticate: resolve req.tenantBranch from X-Active-Branch (validated
 * against allowedBranches) or auto-select when the user has exactly one grant.
 * Does not mutate req.body.branch (user-admin create/update still sets another user's home branch).
 */
export function requireTenantBranch(req, res, next) {
  const allowed = Array.isArray(req.user?.allowedBranches)
    ? req.user.allowedBranches
    : [];

  const headerRaw = req.get('X-Active-Branch');
  const fromHeader = normalizeBranch(headerRaw);

  if (headerRaw != null && headerRaw !== '') {
    // Header was sent — must be a valid, permitted branch
    if (!fromHeader || !allowed.includes(fromHeader)) {
      return next(new ForbiddenError('Branch not permitted'));
    }
    req.tenantBranch = fromHeader;
    return next();
  }

  // No header: auto-select only when the user has exactly one allowed branch
  if (allowed.length === 1) {
    const only = normalizeBranch(allowed[0]);
    if (!only) {
      return next(new ForbiddenError('User has no branch assigned'));
    }
    req.tenantBranch = only;
    return next();
  }

  if (allowed.length > 1) {
    return next(new ForbiddenError('Branch selection required'));
  }

  return next(new ForbiddenError('User has no branch assigned'));
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
