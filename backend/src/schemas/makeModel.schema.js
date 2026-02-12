import { z } from 'zod';

export const createMakeSchema = z.object({
  name: z.string().min(1, 'Make name is required'),
});

export const updateMakeSchema = z.object({
  name: z.string().min(1).optional(),
});

export const createModelSchema = z.object({
  makeId: z.string().uuid('Make is required'),
  name: z.string().min(1, 'Model name is required'),
  paperSize: z.enum(['A3', 'A4']).default('A4'),
  modelType: z.enum(['mono', 'colour']).default('mono'),
  machineLife: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().positive().nullable().optional()),
});

export const updateModelSchema = z.object({
  makeId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  paperSize: z.enum(['A3', 'A4']).optional(),
  modelType: z.enum(['mono', 'colour']).optional(),
  machineLife: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().positive().nullable().optional()),
});
