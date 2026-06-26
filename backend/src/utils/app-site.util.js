import { ForbiddenError, ValidationError } from './errors.js';

const VALID = new Set(['JHB', 'CT']);

/** Parse branch from query string only (preferred for catalog writes). */
export function readQuerySite(req) {
  let raw = req.query?.branch;
  if (Array.isArray(raw)) {
    raw = raw.find((v) => v != null && v !== '') ?? raw[0];
  }
  if (raw == null || raw === '' || raw === 'null' || raw === 'undefined') {
    const url = req.originalUrl || req.url || '';
    const match = url.match(/[?&]branch=(JHB|CT)\b/i);
    if (match) raw = match[1];
  }
  if (raw == null || raw === '' || raw === 'null' || raw === 'undefined') return null;
  const upper = String(raw).toUpperCase();
  return VALID.has(upper) ? upper : null;
}

/** Parse branch from JSON body only. */
export function readBodySite(req) {
  let raw = req.body?.branch;
  if (Array.isArray(raw)) {
    raw = raw.find((v) => v != null && v !== '') ?? raw[0];
  }
  if (raw == null || raw === '' || raw === 'null' || raw === 'undefined') return null;
  const upper = String(raw).toUpperCase();
  return VALID.has(upper) ? upper : null;
}

/** Parse branch from query/body (ignores string "null" / empty). */
export function readRequestedSite(req) {
  return readQuerySite(req) ?? readBodySite(req);
}

/**
 * Catalog POST/PUT/DELETE — require explicit branch; query string wins over body.
 * Throws when both are present but disagree (stale localStorage vs UI site).
 */
export function resolveCatalogWriteSite(req) {
  const fromQuery = readQuerySite(req);
  const fromBody = readBodySite(req);
  if (fromQuery && fromBody && fromQuery !== fromBody) {
    throw new ValidationError(
      `Branch mismatch (query=${fromQuery}, body=${fromBody}). Switch site and hard-refresh, then try again.`
    );
  }
  const site = fromQuery || fromBody;
  const user = req.user;
  const canSwitch =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    ((user?.role === 'meter_user' || user?.role === 'capturer') && !user?.branch);
  if (canSwitch) return site;
  const normalize = (b) => (b && VALID.has(String(b).toUpperCase()) ? String(b).toUpperCase() : null);
  return normalize(user?.branch) || 'JHB';
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

/** For POST/PUT/DELETE — branch must be explicit in query/body for site-switching users. */
export function resolveAppSiteForWrite(req) {
  const user = req.user;
  const requested = readRequestedSite(req);
  const userBranch = user?.branch;
  const canSwitch =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    ((user?.role === 'meter_user' || user?.role === 'capturer') && !userBranch);

  const normalize = (b) => (b && VALID.has(String(b).toUpperCase()) ? String(b).toUpperCase() : null);

  if (canSwitch) {
    return requested;
  }
  return normalize(userBranch) || 'JHB';
}

/** @deprecated Use resolveAppSiteForWrite for mutations */
export function resolveAppSiteStrict(req) {
  return resolveAppSiteForWrite(req);
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
