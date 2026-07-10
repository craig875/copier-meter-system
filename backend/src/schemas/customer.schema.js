import { z } from 'zod';

const branchEnum = z.enum(['JHB', 'CT'], {
  required_error: 'Branch is required',
  invalid_type_error: 'Branch must be JHB or CT',
});

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  branch: branchEnum,
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  branch: branchEnum.optional(),
});

export const customerListQuerySchema = z.object({
  branch: z.enum(['JHB', 'CT']).optional(),
  archived: z.enum(['true', 'false']).optional(),
});
