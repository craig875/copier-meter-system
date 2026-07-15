import { z } from 'zod';

// Shell metacharacters to reject (command injection prevention). Asterisk (*) is allowed.
const DANGEROUS_CHARS = /[;&|`$(){}[\]<>\\'"\n\r]/;

const IPv4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const HOSTNAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.?[a-zA-Z]*$/;

function isValidIP(ip) {
  return IPv4_REGEX.test(ip);
}

function isValidHostname(host) {
  if (host.length > 253) return false;
  return HOSTNAME_REGEX.test(host);
}


export const monitoringTargetSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(200).refine(
    (s) => !DANGEROUS_CHARS.test(s),
    { message: 'Invalid characters in customer name' }
  ),
  siteName: z.string().min(1, 'Site name is required').max(200).refine(
    (s) => !DANGEROUS_CHARS.test(s),
    { message: 'Invalid characters in site name' }
  ),
  supplier: z.string().max(200).optional().nullable().or(z.literal('')).refine(
    (s) => !s || !DANGEROUS_CHARS.test(s),
    { message: 'Invalid characters in supplier' }
  ),
  circuitNumber: z.string().max(200).optional().nullable().or(z.literal('')).refine(
    (s) => !s || !DANGEROUS_CHARS.test(s),
    { message: 'Invalid characters in circuit number' }
  ),
  fno: z.string().max(200).optional().nullable().or(z.literal('')).refine(
    (s) => !s || !DANGEROUS_CHARS.test(s),
    { message: 'Invalid characters in FNO' }
  ),
  monitoringTarget: z.string().min(1, 'Monitoring target is required').max(253).refine(
    (s) => !DANGEROUS_CHARS.test(s),
    { message: 'Invalid characters in monitoring target' }
  ).refine(
    (s) => isValidIP(s) || isValidHostname(s),
    { message: 'Must be a valid IPv4 address or hostname' }
  ),
  serviceType: z.enum(['fibre', 'wireless', 'lte', 'other']).default('other'),
  notes: z.string().max(1000).optional().nullable().refine(
    (s) => !s || !DANGEROUS_CHARS.test(s),
    { message: 'Invalid characters in notes' }
  ),
  alertEmail: z.string().email().optional().nullable().or(z.literal('')),
  contactPersonName: z.string().max(200).optional().nullable().or(z.literal('')).refine(
    (s) => !s || !DANGEROUS_CHARS.test(s),
    { message: 'Invalid characters in contact person name' }
  ),
  contactPersonPhone: z.string().max(50).optional().nullable().or(z.literal('')).refine(
    (s) => !s || !DANGEROUS_CHARS.test(s),
    { message: 'Invalid characters in contact person phone' }
  ),
  status: z.enum(['enabled', 'disabled']).optional().default('enabled'),
  dnsRefreshIntervalMinutes: z.coerce.number().min(1).max(60).optional().default(5),
});

export const updateMonitoringTargetSchema = monitoringTargetSchema.partial();

export const targetStatusSchema = z.object({
  status: z.enum(['enabled', 'disabled']),
});

export const alertTimeWindowSchema = z.object({
  id: z.string().uuid().optional(),
  targetId: z.string().uuid().optional().nullable().or(z.literal('')),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format: HH:mm'),
  endTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format: HH:mm'),
  daysOfWeek: z.array(z.number().min(1).max(7)),
  enabled: z.boolean().optional().default(true),
});

const branchQuery = z.enum(['JHB', 'CT']).optional();

export const uptimeReportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  customerName: z.string().optional(),
  siteName: z.string().optional(),
  targetId: z.string().uuid().optional(),
  branch: branchQuery,
});

export const exportReportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  format: z.enum(['csv', 'pdf']).default('csv'),
  branch: branchQuery,
});

export const outagesQuerySchema = z.object({
  targetId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().min(1).max(500).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  branch: branchQuery,
});

export const outageNoteSchema = z.object({
  note: z.string().max(2000).optional().nullable().or(z.literal('')).refine(
    (s) => !s || !DANGEROUS_CHARS.test(s),
    { message: 'Invalid characters in outage note' }
  ),
});
