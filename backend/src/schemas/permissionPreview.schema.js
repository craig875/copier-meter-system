import { z } from 'zod';
import { ALL_PERMISSION_KEYS } from '../permissions/catalog.js';
import { KNOWN_MODULES } from '../utils/permissions.js';

/** Zod requires a non-empty tuple; catalog is the sole source of truth. */
const permissionKeySchema = z.enum(
  /** @type {[string, ...string[]]} */ ([...ALL_PERMISSION_KEYS])
);

/** Zod requires a non-empty tuple; KNOWN_MODULES is the sole source of truth. */
const moduleKeySchema = z.enum(
  /** @type {[string, ...string[]]} */ ([...KNOWN_MODULES])
);

/**
 * POST /api/permissions/preview — real user (userId) or hypothetical draft.
 */
export const previewEffectivePermissionsSchema = z
  .object({
    userId: z.string().uuid().optional(),
    roleId: z.string().uuid().optional(),
    roleKey: z.string().min(1).optional(),
    permissionKeys: z.array(permissionKeySchema).optional(),
    overrides: z
      .array(
        z.object({
          permissionKey: permissionKeySchema,
          effect: z.enum(['GRANT', 'DENY']),
        })
      )
      .optional(),
    modules: z.array(moduleKeySchema).optional(),
  })
  .superRefine((b, ctx) => {
    if (b.userId) {
      if (
        b.roleId !== undefined ||
        b.roleKey !== undefined ||
        b.permissionKeys !== undefined ||
        b.overrides !== undefined ||
        b.modules !== undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'userId preview cannot be combined with draft role/overrides/modules',
        });
      }
      return;
    }
    if (!b.roleId && !b.roleKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide userId, or roleId / roleKey for hypothetical preview',
      });
    }
  });
