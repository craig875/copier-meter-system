import { z } from 'zod';

const unchangedReasonSchema = z.string().min(1, 'Reason is required').max(500).nullable().optional();

export const readingInputSchema = z.object({
  machineId: z.string().uuid('Invalid machine ID'),
  monoReading: z.number().int().min(0).nullable().optional(),
  colourReading: z.number().int().min(0).nullable().optional(),
  scanReading: z.number().int().min(0).nullable().optional(),
  note: z.string().max(500, 'Note must be 500 characters or less').nullable().optional(),
  unableToRead: z.boolean().optional(),
  unableToReadReason: z.string().max(500, 'Reason must be 500 characters or less').nullable().optional(),
  monoUnchangedReason: unchangedReasonSchema,
  colourUnchangedReason: unchangedReasonSchema,
  scanUnchangedReason: unchangedReasonSchema,
}).superRefine((data, ctx) => {
  if (data.unableToRead) {
    const reason = typeof data.unableToReadReason === 'string' ? data.unableToReadReason.trim() : '';
    if (!reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason is required when Unable to obtain is selected',
        path: ['unableToReadReason'],
      });
    }
    return;
  }

  const hasValue = data.monoReading != null
    || data.colourReading != null
    || data.scanReading != null;
  if (!hasValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'All enabled counter readings are required, or mark Unable to obtain',
      path: ['monoReading'],
    });
  }
});

export const submitReadingsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  readings: z.array(readingInputSchema).min(1, 'At least one reading is required'),
  branch: z.enum(['JHB', 'CT']).optional(),
});

export const readingsQuerySchema = z.object({
  year: z.string().transform(Number).pipe(z.number().int().min(2000).max(2100)),
  month: z.string().transform(Number).pipe(z.number().int().min(1).max(12)),
  branch: z.enum(['JHB', 'CT']).optional(),
});

export const exportQuerySchema = z.object({
  year: z.string().transform(Number).pipe(z.number().int().min(2000).max(2100)),
  month: z.string().transform(Number).pipe(z.number().int().min(1).max(12)),
  branch: z.enum(['JHB', 'CT']).optional(),
});

export const unlockQuerySchema = z.object({
  year: z.string().transform(Number).pipe(z.number().int().min(2000).max(2100)),
  month: z.string().transform(Number).pipe(z.number().int().min(1).max(12)),
  branch: z.enum(['JHB', 'CT']),
});

export const unableToObtainOverrideSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  machineId: z.string().uuid('Invalid machine ID'),
  reason: z.string().trim().min(1, 'Override reason is required').max(500, 'Reason must be 500 characters or less'),
});

export const unableToObtainOverrideRequestSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  machineId: z.string().uuid('Invalid machine ID'),
  note: z.string().max(500, 'Note must be 500 characters or less').nullable().optional(),
});

export const importReadingsSchema = z.object({
  data: z.array(z.object({
    machineSerialNumber: z.string().min(1, 'Machine serial number is required'),
    monoReading: z.union([z.number().int().min(0), z.string(), z.null()]).optional(),
    colourReading: z.union([z.number().int().min(0), z.string(), z.null()]).optional(),
    scanReading: z.union([z.number().int().min(0), z.string(), z.null()]).optional(),
    unableToRead: z.union([z.boolean(), z.string(), z.null()]).optional(),
    unableToReadReason: z.string().max(500).nullable().optional(),
    monoUnchangedReason: z.string().max(500).nullable().optional(),
    colourUnchangedReason: z.string().max(500).nullable().optional(),
    scanUnchangedReason: z.string().max(500).nullable().optional(),
    note: z.string().max(500).nullable().optional(),
  })).min(1, 'At least one reading row is required'),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  branch: z.enum(['JHB', 'CT']),
});
