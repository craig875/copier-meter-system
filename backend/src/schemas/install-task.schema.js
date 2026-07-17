import { z } from 'zod';
import { INSTALL_TASK_STATUSES } from '../constants/install-task-statuses.js';

const statusEnum = z.enum(INSTALL_TASK_STATUSES);

export const createInstallTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  assignedToId: z.string().uuid('Invalid assignee'),
});

export const updateInstallTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  assignedToId: z.string().uuid().optional(),
});

export const updateInstallTaskStatusSchema = z.object({
  status: statusEnum,
});
