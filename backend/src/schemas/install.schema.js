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
  typeId: z.string().uuid('Invalid type ID'),
  customerName: z.string().min(1, 'Customer name is required'),
  siteName: z.string().optional().nullable(),
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
  typeId: z.string().uuid().optional(),
  customerName: z.string().min(1).optional(),
  siteName: z.string().optional().nullable(),
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
