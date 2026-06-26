import { ForbiddenError } from './errors.js';

const VALID = new Set(['JHB', 'CT']);

/** Parse branch from query/body (ignores string "null" / empty). */
export function readRequestedSite(req) {
  let raw = req.query?.branch ?? req.body?.branch;
  if (Array.isArray(raw)) {
    raw = raw.find((v) => v != null && v !== '') ?? raw[0];
  }
  if (raw == null || raw === '' || raw === 'null' || raw === 'undefined') return null;
  const upper = String(raw).toUpperCase();
  return VALID.has(upper) ? upper : null;
}

/**
 * Resolves app site scope (JHB/CT) aligned with frontend `effectiveBranch`.
 * @param {import('express').Request} req
 * @returns {'JHB' | 'CT' | null}
 */
export function resolveAppSite(req) {
  const user = req.user;
  const requested = readRequestedSite(req);
  const userBranch = user?.branch;
  const canSwitch =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    ((user?.role === 'meter_user' || user?.role === 'capturer') && !userBranch);

  const normalize = (b) => (b && VALID.has(String(b).toUpperCase()) ? String(b).toUpperCase() : null);

  if (canSwitch) {
    return requested || normalize(userBranch) || null;
  }
  return normalize(userBranch) || 'JHB';
}

/** For GET list endpoints — never default site for branch-switching users. */
export function resolveAppSiteForRead(req) {
  return resolveAppSite(req);
}

/** For POST/PUT/DELETE — require an explicit or assigned site. */
export function resolveAppSiteStrict(req) {
  return resolveAppSite(req);
}

export function assertMakeInSite(make, site) {
  if (!make || make.branch !== site) {
    throw new ForbiddenError('Make not available for this site');
  }
}

export function assertMachineInSite(machine, site) {
  if (!machine || machine.branch !== site) {
    throw new ForbiddenError('Machine not available for this site');
  }
}
