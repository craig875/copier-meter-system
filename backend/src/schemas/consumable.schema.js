import { z } from 'zod';

export const partTypeEnum = z.enum(['general', 'toner']);
export const tonerColorEnum = z.enum(['black', 'cyan', 'magenta', 'yellow']);
export const meterTypeEnum = z.enum(['mono', 'colour', 'total']);

export const createModelPartSchema = z.object({
  modelId: z.string().uuid('Model is required'),
  partName: z.string().min(1, 'Part name is required'),
  itemCode: z.string().optional().nullable(),
  partType: partTypeEnum.default('general'),
  tonerColor: tonerColorEnum.optional().nullable(),
  expectedYield: z.number().int().min(1, 'Expected yield must be at least 1'),
  costRand: z.number().min(0, 'Cost must be >= 0'),
  meterType: meterTypeEnum.default('mono'),
  branch: z.enum(['JHB', 'CT']).optional(),
});

export const updateModelPartSchema = z.object({
  modelId: z.string().uuid().optional(),
  partName: z.string().min(1).optional(),
  itemCode: z.string().optional().nullable(),
  partType: partTypeEnum.optional(),
  tonerColor: tonerColorEnum.optional().nullable(),
  expectedYield: z.number().int().min(1).optional(),
  costRand: z.number().min(0).optional(),
  meterType: meterTypeEnum.optional(),
  branch: z.enum(['JHB', 'CT']).optional(),
  isActive: z.boolean().optional(),
});

export const recordPartOrderSchema = z.object({
  machineId: z.string().uuid(),
  modelPartId: z.string().uuid(),
  orderDate: z.union([z.string(), z.coerce.date()]),
  currentReading: z.number().int().min(0),
  remainingTonerPercent: z.number().min(0).max(100).optional(),
});

export const consumableSummaryQuerySchema = z.object({
  branch: z.enum(['JHB', 'CT']).optional(),
  model: z.string().optional(),
  partType: partTypeEnum.optional(),
  complianceStatus: z.enum(['met', 'not_met']).optional(),
});

const pastOrderRowSchema = z
  .object({
    machine_serial_number: z.string().min(1, 'Machine serial number required'),
    item_code: z.string().optional(),
    part_name: z.string().optional(),
    order_date: z.union([z.string(), z.coerce.date()]),
    prior_reading: z.coerce.number().int().min(0),
    current_reading: z.coerce.number().int().min(0),
    toner_percent: z.coerce.number().min(0).max(100).optional(),
  })
  .refine((row) => (row.item_code?.trim() || row.part_name?.trim()), {
    message: 'Each row must have item_code or part_name',
  });

export const importPartOrdersSchema = z.object({
  data: z.array(pastOrderRowSchema).min(1, 'At least one row required'),
});
