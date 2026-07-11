import { z } from 'zod';

/** Client-supplied branch is ignored; tenant middleware stamps ownership. */
export const createMakeSchema = z
  .object({
    name: z.string().min(1, 'Make name is required'),
    branch: z.enum(['JHB', 'CT']).optional(),
  })
  .transform(({ branch: _branch, ...rest }) => rest);

export const updateMakeSchema = z
  .object({
    name: z.string().min(1).optional(),
    branch: z.enum(['JHB', 'CT']).optional(),
  })
  .transform(({ branch: _branch, ...rest }) => rest);

export const createModelSchema = z
  .object({
    makeId: z.string().uuid('Make is required'),
    name: z.string().min(1, 'Model name is required'),
    paperSize: z.enum(['A3', 'A4']).default('A4'),
    modelType: z.enum(['mono', 'colour']).default('mono'),
    machineLife: z.preprocess(
      (v) => (v === '' || v == null ? null : Number(v)),
      z.number().int().positive().nullable().optional()
    ),
    branch: z.enum(['JHB', 'CT']).optional(),
  })
  .transform(({ branch: _branch, ...rest }) => rest);

export const updateModelSchema = z
  .object({
    makeId: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    paperSize: z.enum(['A3', 'A4']).optional(),
    modelType: z.enum(['mono', 'colour']).optional(),
    machineLife: z.preprocess(
      (v) => (v === '' || v == null ? null : Number(v)),
      z.number().int().positive().nullable().optional()
    ),
    branch: z.enum(['JHB', 'CT']).optional(),
  })
  .transform(({ branch: _branch, ...rest }) => rest);
