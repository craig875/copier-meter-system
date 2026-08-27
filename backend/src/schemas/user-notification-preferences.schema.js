import { z } from 'zod';

export const updateNotificationPreferencesSchema = z
  .object({
    connectivityAlertsEnabled: z.boolean(),
  })
  .strict();
