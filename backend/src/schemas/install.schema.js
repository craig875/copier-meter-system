import { z } from 'zod';
import { INSTALL_STATUSES } from '../constants/install-statuses.js';

const statusEnum = z.enum(INSTALL_STATUSES);
const branchEnum = z.enum(['JHB', 'CT']);
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .nullable()
  .optional();

export const createInstallSchema = z.object({
  branch: branchEnum.optional(),
  typeName: z.string().trim().min(1, 'Type is required').max(120),
  /** Optional legacy catalog FK — kept for compatibility; not required. */
  typeId: z.string().uuid('Invalid type ID').optional().nullable(),
  customerName: z.string().min(1, 'Customer name is required'),
  siteName: z.string().optional().nullable(),
  area: z.string().max(120).optional().nullable(),
  siteAddress: z.string().optional().nullable(),
  salesOrderNumber: z.string().optional().nullable(),
  status: statusEnum.optional(),
  progress: z.string().optional().nullable(),
  scheduledDate: dateString,
  completedDate: dateString,
  assignedTechnicianName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  /** Optional primary OneDrive / docs link on create */
  documentUrl: z.string().url().optional().nullable(),
  documentLabel: z.string().optional().nullable(),
});

export const updateInstallSchema = z.object({
  typeName: z.string().trim().min(1).max(120).optional(),
  /** Optional legacy catalog FK — kept for compatibility. */
  typeId: z.string().uuid().optional().nullable(),
  customerName: z.string().min(1).optional(),
  siteName: z.string().optional().nullable(),
  area: z.string().max(120).optional().nullable(),
  siteAddress: z.string().optional().nullable(),
  salesOrderNumber: z.string().optional().nullable(),
  status: statusEnum.optional(),
  progress: z.string().optional().nullable(),
  scheduledDate: dateString,
  completedDate: dateString,
  assignedTechnicianName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  /** Optional note recorded on the timeline when status/progress change */
  note: z.string().optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
  documentLabel: z.string().optional().nullable(),
});

export const installListQuerySchema = z.object({
  branch: branchEnum.optional(),
  status: statusEnum.optional(),
  typeId: z.string().uuid().optional(),
  search: z.string().optional(),
  activeOnly: z.enum(['true', 'false']).optional(),
  completedOnly: z.enum(['true', 'false']).optional(),
});
