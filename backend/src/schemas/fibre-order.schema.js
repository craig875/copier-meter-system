import { z } from 'zod';

const orderStatusEnum = z.enum([
  'order_placed',
  'awaiting_cx_creation',
  'awaiting_site_survey_scheduling',
  'site_survey_scheduled',
  'awaiting_planning_documents',
  'awaiting_planning_sign_off',
  'wayleave_pending',
  'wayleave_approved',
  'scheduled',
  'complete',
  'cancelled',
  'on_hold',
]);

const branchEnum = z.enum(['JHB', 'CT']);

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const createFibreOrderSchema = z.object({
  branch: branchEnum,
  customerName: z.string().min(1, 'Customer name is required'),
  customerReference: z.string().optional().nullable(),
  installationAddress: z.string().min(1, 'Installation address is required'),
  productId: z.string().min(1, 'Product is required'),
  salesAgentId: z.string().uuid('Invalid sales agent ID'),
  orderPlacementDate: dateString,
  status: orderStatusEnum.optional(),
  notes: z.string().optional().nullable(),
});

export const updateFibreOrderSchema = z.object({
  branch: branchEnum.optional(),
  customerName: z.string().min(1).optional(),
  customerReference: z.string().optional().nullable(),
  installationAddress: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  salesAgentId: z.string().uuid().optional(),
  orderPlacementDate: dateString.optional(),
  status: orderStatusEnum.optional(),
  note: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const addOrderNoteSchema = z.object({
  note: z.string().min(1, 'Note is required'),
});

export const requestOrderUpdateSchema = z.object({
  note: z.string().max(500).optional().nullable(),
});

export const fibreOrderListQuerySchema = z.object({
  branch: branchEnum.optional(),
  status: orderStatusEnum.optional(),
  salesAgentId: z.string().uuid().optional(),
  search: z.string().optional(),
  activeOnly: z.enum(['true', 'false']).optional(),
  completedOnly: z.enum(['true', 'false']).optional(),
});

export const fibreOrderStatsQuerySchema = z.object({
  branch: branchEnum.optional(),
});
