import { z } from 'zod';

export const createMachineSchema = z.object({
  machineSerialNumber: z.string().min(1, 'Machine serial number is required'),
  customer: z.string().optional(),
  model: z.string().optional(),
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
  customer: z.string().optional(),
  model: z.string().optional(),
  contractReference: z.string().optional(),
  monoEnabled: z.boolean().optional(),
  colourEnabled: z.boolean().optional(),
  scanEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isDecommissioned: z.boolean().optional(),
  branch: z.enum(['JHB', 'CT']).optional(),
});

export const machineQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(1000)).optional().default('50'),
  search: z.string().optional(),
  isActive: z.string().transform(v => v === 'true').optional(),
  branch: z.enum(['JHB', 'CT']).optional(),
});
