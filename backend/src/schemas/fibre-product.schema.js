import { z } from 'zod';

/** Client-supplied branch is ignored; tenant middleware stamps ownership. */
export const createFibreProductSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    productType: z.string().min(1, 'Product type is required'),
    defaultEtaWeeks: z.coerce.number().int().min(1, 'ETA must be at least 1 week'),
    notes: z.string().optional().nullable(),
    branch: z.enum(['JHB', 'CT']).optional(),
  })
  .transform(({ branch: _branch, ...rest }) => rest);

export const updateFibreProductSchema = z
  .object({
    name: z.string().min(1).optional(),
    productType: z.string().min(1).optional(),
    defaultEtaWeeks: z.coerce.number().int().min(1).optional(),
    notes: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    branch: z.enum(['JHB', 'CT']).optional(),
  })
  .transform(({ branch: _branch, ...rest }) => rest);
