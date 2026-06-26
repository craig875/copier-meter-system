import { ForbiddenError } from './errors.js';

const VALID = new Set(['JHB', 'CT']);

/**
 * Resolves app site scope (JHB/CT) aligned with frontend `effectiveBranch`.
 * @param {import('express').Request} req
 * @returns {'JHB' | 'CT'}
 */
export function resolveAppSite(req) {
  const user = req.user;
  const requested = req.query.branch ?? req.body?.branch;
  const userBranch = user?.branch;
  const canSwitch =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    ((user?.role === 'meter_user' || user?.role === 'capturer') && !userBranch);

  const normalize = (b) => (b && VALID.has(String(b).toUpperCase()) ? String(b).toUpperCase() : 'JHB');

  if (canSwitch) {
    return normalize(requested || userBranch);
  }
  return normalize(userBranch);
}

export function assertMakeInSite(make, site) {
  if (!make || make.branch !== site) {
    throw new ForbiddenError('Make not available for this site');
  }
}
