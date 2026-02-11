import { z } from 'zod';

export const readingInputSchema = z.object({
  machineId: z.string().uuid('Invalid machine ID'),
  monoReading: z.number().int().min(0).nullable().optional(),
  colourReading: z.number().int().min(0).nullable().optional(),
  scanReading: z.number().int().min(0).nullable().optional(),
  note: z.string().max(500, 'Note must be 500 characters or less').nullable().optional(),
}).refine(
  (data) => {
    // At least one reading value or a note must be provided
    return data.monoReading != null || 
           data.colourReading != null || 
           data.scanReading != null || 
           (data.note != null && data.note.trim().length > 0);
  },
  {
    message: 'Either at least one reading value or a note must be provided',
  }
);

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

export const importReadingsSchema = z.object({
  data: z.array(z.object({
    machineSerialNumber: z.string().min(1, 'Machine serial number is required'),
    monoReading: z.union([z.number().int().min(0), z.string(), z.null()]).optional(),
    colourReading: z.union([z.number().int().min(0), z.string(), z.null()]).optional(),
    scanReading: z.union([z.number().int().min(0), z.string(), z.null()]).optional(),
  })).min(1, 'At least one reading row is required'),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  branch: z.enum(['JHB', 'CT']),
});
