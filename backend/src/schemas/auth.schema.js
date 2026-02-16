import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'meter_user', 'capturer']).default('meter_user'),
  branch: z.union([
    z.enum(['JHB', 'CT']),
    z.literal(''),
    z.null(),
  ]).optional().transform(val => val === '' ? null : val),
  // Meter users can have no branch assigned, which means they can access all branches
});

export const verify2FASchema = z.object({
  tempToken: z.string().min(1, 'Temp token is required'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits'),
});

export const verifySetupSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits'),
  secret: z.string().min(1, 'Secret is required'),
});

export const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['admin', 'meter_user', 'capturer']).optional(),
  branch: z.union([
    z.enum(['JHB', 'CT']),
    z.literal(''),
    z.null(),
  ]).optional().transform(val => val === '' ? null : val),
  // Meter users can have no branch assigned, which means they can access all branches
});
