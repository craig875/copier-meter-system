import { z } from 'zod';
import {
  FIBRE_PIPELINE_STATUSES,
  FIBRE_OVERLAY_STATUSES,
} from '../constants/fibre-order-statuses.js';

const pipelineStatusEnum = z.enum(FIBRE_PIPELINE_STATUSES);
const overlayStatusEnum = z.enum(FIBRE_OVERLAY_STATUSES);

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
  pipelineStatus: pipelineStatusEnum.optional(),
  overlayStatus: overlayStatusEnum.optional().nullable(),
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
  pipelineStatus: pipelineStatusEnum.optional(),
  overlayStatus: z.union([overlayStatusEnum, z.null()]).optional(),
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
  pipelineStatus: pipelineStatusEnum.optional(),
  overlayStatus: overlayStatusEnum.optional(),
  salesAgentId: z.string().uuid().optional(),
  search: z.string().optional(),
  activeOnly: z.enum(['true', 'false']).optional(),
  completedOnly: z.enum(['true', 'false']).optional(),
});

export const fibreOrderStatsQuerySchema = z.object({
  branch: branchEnum.optional(),
});
