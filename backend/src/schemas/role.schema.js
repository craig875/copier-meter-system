import { z } from 'zod';
import { ALL_PERMISSION_KEYS } from '../permissions/catalog.js';

/** Zod requires a non-empty tuple; catalog is the sole source of truth. */
const permissionKeySchema = z.enum(
  /** @type {[string, ...string[]]} */ ([...ALL_PERMISSION_KEYS])
);

/**
 * PUT /api/roles/:id — rename/describe and/or full-replace role permissions.
 * Self-subset escalation is enforced in the service layer (needs caller effective set).
 */
export const updateRoleSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100).optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description must be at most 500 characters')
      .nullable()
      .optional(),
    /** Present ⇒ full replace of role_permissions (empty array allowed). */
    permissionKeys: z.array(permissionKeySchema).optional(),
  })
  .refine(
    (b) =>
      b.name !== undefined ||
      b.description !== undefined ||
      b.permissionKeys !== undefined,
    { message: 'Provide name, description, and/or permissionKeys' }
  );
