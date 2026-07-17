import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const moduleKey = z.enum(['copiers', 'connectivity', 'fibre-orders']);
const branchEnum = z.enum(['JHB', 'CT'], {
  required_error: 'Branch is required',
  invalid_type_error: 'Branch must be JHB or CT',
});

export const switchBranchSchema = z.object({
  branch: branchEnum,
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'manager', 'meter_user', 'capturer', 'sales_agent']).default('meter_user'),
  branch: branchEnum,
  modules: z.array(moduleKey).optional(),
  allowedBranches: z.array(branchEnum).min(1, 'Select at least one branch').optional(),
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
  role: z.enum(['admin', 'manager', 'meter_user', 'capturer', 'sales_agent']).optional(),
  branch: branchEnum.optional(),
  modules: z.array(moduleKey).optional(),
  allowedBranches: z.array(branchEnum).min(1, 'Select at least one branch').optional(),
});
