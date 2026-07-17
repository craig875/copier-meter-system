import { hasAdminAccess } from '../utils/permissions.js';
import { recordPermissionShadowMismatch } from '../permissions/shadowLog.js';

/** Pure check against Stage B effective permissions. */
export function userHasPermission(user, key) {
  return Array.isArray(user?.permissions) && user.permissions.includes(key);
}

/**
 * Stage C shadow observer — NEVER blocks.
 * Compares elevated enum gate (same as requireAdmin) vs permission key.
 * Logs only when they disagree, then always next().
 */
export function shadowRequirePermission(permissionKey, options = {}) {
  const oldAllows =
    options.oldAllows ??
    ((req) => hasAdminAccess(req.user?.role));

  return (req, res, next) => {
    const oldAllowed = !!oldAllows(req);
    const newAllowed = userHasPermission(req.user, permissionKey);

    if (oldAllowed !== newAllowed && req.user?.id) {
      const route = `${req.method} ${req.baseUrl}${req.route?.path ?? req.path}`;
      // Fire-and-forget so logging never delays or fails the request
      recordPermissionShadowMismatch({
        userId: req.user.id,
        route,
        permissionKey,
        oldAllowed,
        newAllowed,
      }).catch((err) => {
        console.error('[permission-shadow] log failed:', err.message);
      });
    }

    next();
  };
}

/**
 * Future Stage D cutover helper (NOT wired in Stage C).
 * Do not mount on routes yet — blocking enforcement comes later.
 */
export function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!userHasPermission(req.user, permissionKey)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}
