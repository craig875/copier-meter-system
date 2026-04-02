import { ForbiddenError } from '../utils/errors.js';

const VALID = new Set(['JHB', 'CT']);

/**
 * Resolves connectivity scope to a single branch (aligned with frontend `effectiveBranch`).
 * @param {import('express').Request} req
 * @returns {string}
 */
export function resolveConnectivityBranch(req) {
  const user = req.user;
  const q = req.query.branch;
  const userBranch = user?.branch;
  const canSwitch =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    ((user?.role === 'meter_user' || user?.role === 'capturer') && !userBranch);

  const normalize = (b) => (b && VALID.has(String(b).toUpperCase()) ? String(b).toUpperCase() : 'JHB');

  if (canSwitch) {
    return normalize(q || userBranch);
  }
  return normalize(userBranch);
}

export function assertTargetInBranch(target, branch) {
  if (!target || target.branch !== branch) {
    throw new ForbiddenError('Monitoring target not available for this branch');
  }
}
