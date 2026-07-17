import prisma from '../config/database.js';

/**
 * Persist a Stage C old-vs-new permission mismatch for soak review.
 * Never throws to the request path — callers should .catch().
 */
export async function recordPermissionShadowMismatch({
  userId,
  route,
  permissionKey,
  oldAllowed,
  newAllowed,
}) {
  await prisma.permissionShadowLog.create({
    data: {
      userId,
      route,
      permissionKey,
      oldAllowed,
      newAllowed,
    },
  });
}
