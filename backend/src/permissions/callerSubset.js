import { ValidationError } from '../utils/errors.js';

/**
 * Self-subset escalation: every key must appear in the caller's effective set.
 *
 * @param {string[]} keys
 * @param {string[]|null|undefined} callerPermissions
 * @param {string} field - Zod/body field name for the error payload
 * @param {string} message
 */
export function assertKeysWithinCallerSet(keys, callerPermissions, field, message) {
  const allowed = new Set(Array.isArray(callerPermissions) ? callerPermissions : []);
  const rejectedKeys = [...new Set(keys)].filter((k) => !allowed.has(k));
  if (rejectedKeys.length > 0) {
    throw new ValidationError('Validation failed', [
      { field, message, rejectedKeys },
    ]);
  }
}
