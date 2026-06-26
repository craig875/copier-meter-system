import { ForbiddenError } from './errors.js';

const VALID = new Set(['JHB', 'CT']);

/**
 * Resolves app site scope (JHB/CT) aligned with frontend `effectiveBranch`.
 * @param {import('express').Request} req
 * @returns {'JHB' | 'CT'}
 */
export function resolveAppSite(req) {
  const user = req.user;
  const requested = req.query.branch ?? req.body?.branch ?? req.headers['x-app-site'];
  const userBranch = user?.branch;
  const canSwitch =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    ((user?.role === 'meter_user' || user?.role === 'capturer') && !userBranch);

  const normalize = (b) => (b && VALID.has(String(b).toUpperCase()) ? String(b).toUpperCase() : null);

  if (canSwitch) {
    const site = normalize(requested || userBranch);
    return site || 'JHB';
  }
  return normalize(userBranch) || 'JHB';
}

/** Like resolveAppSite but returns null when site-switching users omit branch (for strict catalog reads). */
export function resolveAppSiteStrict(req) {
  const user = req.user;
  const requested = req.query.branch ?? req.body?.branch ?? req.headers['x-app-site'];
  const userBranch = user?.branch;
  const canSwitch =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    ((user?.role === 'meter_user' || user?.role === 'capturer') && !userBranch);

  const normalize = (b) => (b && VALID.has(String(b).toUpperCase()) ? String(b).toUpperCase() : null);

  if (canSwitch) {
    return normalize(requested || userBranch);
  }
  return normalize(userBranch) || 'JHB';
}

export function assertMakeInSite(make, site) {
  if (!make || make.branch !== site) {
    throw new ForbiddenError('Make not available for this site');
  }
}
