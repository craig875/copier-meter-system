import { ForbiddenError } from '../utils/errors.js';
import { OWNER_EMAIL } from './rolePermissionMatrix.js';

/**
 * Reject mutations against the immutable Owner role.
 * @param {{ key?: string, isImmutable?: boolean } | null | undefined} role
 */
export function assertRoleMutable(role) {
  if (role?.isImmutable || role?.key === 'owner') {
    throw new ForbiddenError('Owner role is immutable and cannot be modified');
  }
}

/**
 * Whether a user is Owner-protected (immutable account for override mutations).
 * Same predicate as assertUserNotOwnerProtected — used by publicUser serializers.
 * @param {{ email?: string, assignedRole?: { key?: string } | null } | null | undefined} user
 * @returns {boolean}
 */
export function isOwnerProtected(user) {
  return user?.assignedRole?.key === 'owner' || user?.email === OWNER_EMAIL;
}

/**
 * Reject override mutations targeting the Owner account.
 * @param {{ email?: string, assignedRole?: { key?: string } | null } | null | undefined} user
 */
export function assertUserNotOwnerProtected(user) {
  if (isOwnerProtected(user)) {
    throw new ForbiddenError(
      'Permission overrides cannot be applied to the Owner account'
    );
  }
}
