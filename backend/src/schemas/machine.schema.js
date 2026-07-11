import { z } from 'zod';

/** Express may pass a single string or an array for duplicate query keys */
function firstQueryValue(val) {
  if (val === undefined || val === null || val === '') return undefined;
  return Array.isArray(val) ? val[0] : val;
}

export const createMachineSchema = z.object({
  machineSerialNumber: z.string().min(1, 'Machine serial number is required'),
  customerId: z.string().uuid().optional().nullable(),
  modelId: z.string().uuid().optional(),
  location: z.string().max(500).optional().nullable(),
  contractReference: z.string().optional(),
  monoEnabled: z.boolean().default(true),
  colourEnabled: z.boolean().default(false),
  scanEnabled: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isDecommissioned: z.boolean().default(false),
  branch: z.enum(['JHB', 'CT']).optional(),
});

export const updateMachineSchema = z.object({
  machineSerialNumber: z.string().min(1).optional(),
  customerId: z.string().uuid().optional().nullable(),
  modelId: z.string().uuid().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  contractReference: z.string().optional(),
  monoEnabled: z.boolean().optional(),
  colourEnabled: z.boolean().optional(),
  scanEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isDecommissioned: z.boolean().optional(),
  branch: z.enum(['JHB', 'CT']).optional(),
});

export const machineQuerySchema = z.object({
  page: z.preprocess(
    (v) => firstQueryValue(v) ?? '1',
    z.string().transform(Number).pipe(z.number().int().min(1))
  ),
  limit: z.preprocess(
    (v) => firstQueryValue(v) ?? '50',
    z.string().transform(Number).pipe(z.number().int().min(1).max(1000))
  ),
  search: z.preprocess((v) => firstQueryValue(v), z.string().optional()),
  isActive: z.preprocess(
    (v) => firstQueryValue(v),
    z.string().optional().transform((s) => (s === undefined ? undefined : s === 'true'))
  ),
  decommissioned: z.preprocess(
    (v) => firstQueryValue(v),
    z.string().optional().transform((s) => (s === undefined ? undefined : s === 'true'))
  ),
  branch: z.preprocess(
    (v) => firstQueryValue(v),
    z.enum(['JHB', 'CT']).optional()
  ),
});
