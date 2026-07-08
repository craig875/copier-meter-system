import { z } from 'zod';

export const createFibreProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  productType: z.string().min(1, 'Product type is required'),
  defaultEtaWeeks: z.coerce.number().int().min(1, 'ETA must be at least 1 week'),
  notes: z.string().optional().nullable(),
});

export const updateFibreProductSchema = createFibreProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});
