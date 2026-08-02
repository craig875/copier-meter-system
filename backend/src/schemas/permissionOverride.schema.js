import { z } from 'zod';
import { ALL_PERMISSION_KEYS } from '../permissions/catalog.js';

/** Zod requires a non-empty tuple; catalog is the sole source of truth. */
const permissionKeySchema = z.enum(
  /** @type {[string, ...string[]]} */ ([...ALL_PERMISSION_KEYS])
);

/**
 * PUT /api/users/:userId/permission-overrides — upsert one GRANT/DENY.
 * Self-subset escalation is enforced in the service layer (needs caller effective set).
 */
export const upsertPermissionOverrideSchema = z.object({
  permissionKey: permissionKeySchema,
  effect: z.enum(['GRANT', 'DENY'], {
    errorMap: () => ({ message: 'effect must be GRANT or DENY' }),
  }),
  note: z
    .string()
    .trim()
    .max(500, 'Note must be at most 500 characters')
    .nullable()
    .optional(),
});
