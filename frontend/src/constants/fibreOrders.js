/** Align with backend `utils/permissions.js` — add keys when new modules ship */
export const MODULE_COPERS = 'copiers';
export const MODULE_CONNECTIVITY = 'connectivity';
export const MODULE_FIBRE_ORDERS = 'fibre-orders';

export const MODULE_OPTIONS = [
  { key: MODULE_COPERS, label: 'Copiers', description: 'Meter readings, customers, consumables' },
  { key: MODULE_CONNECTIVITY, label: 'Connectivity', description: 'Link monitoring, SLA, alerts' },
  { key: MODULE_FIBRE_ORDERS, label: 'Fibre Orders', description: 'Track fibre orders and installation progress' },
];

export const ORDER_STATUSES = [
  { value: 'order_placed', label: 'Order Placed' },
  { value: 'awaiting_cx_creation', label: 'Awaiting CX Creation' },
  { value: 'awaiting_site_survey_scheduling', label: 'Awaiting Site Survey Scheduling' },
  { value: 'site_survey_scheduled', label: 'Site Survey Scheduled' },
  { value: 'awaiting_planning_documents', label: 'Awaiting Planning Documents' },
  { value: 'awaiting_planning_sign_off', label: 'Awaiting Planning Sign Off' },
  { value: 'wayleave_pending', label: 'Wayleave Pending' },
  { value: 'wayleave_approved', label: 'Wayleave Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'complete', label: 'Complete' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Orders that have finished the install workflow or were cancelled */
export const TERMINAL_ORDER_STATUSES = ['complete', 'cancelled'];

export const isActiveFibreOrder = (status) => !TERMINAL_ORDER_STATUSES.includes(status);

/** Statuses shown on the active orders list (excludes complete + cancelled) */
export const ACTIVE_ORDER_STATUSES = ORDER_STATUSES.filter(
  (s) => isActiveFibreOrder(s.value)
);

/** Late pipeline — wayleave signed off or install scheduled */
export const ALMOST_COMPLETE_STATUSES = ['wayleave_approved', 'scheduled'];

/** Main install pipeline (excludes on_hold / cancelled) */
export const PIPELINE_STATUSES = ORDER_STATUSES.filter(
  (s) => s.value !== 'on_hold' && s.value !== 'cancelled'
).map((s) => s.value);

export const statusLabel = (status) =>
  ORDER_STATUSES.find((s) => s.value === status)?.label ?? status?.replace(/_/g, ' ') ?? status;

/** Badge background/text — shared with FibreStatusBadge */
export const STATUS_BADGE_STYLES = {
  order_placed: 'bg-blue-100 text-blue-800',
  awaiting_cx_creation: 'bg-sky-100 text-sky-800',
  awaiting_site_survey_scheduling: 'bg-cyan-100 text-cyan-800',
  site_survey_scheduled: 'bg-teal-100 text-teal-800',
  awaiting_planning_documents: 'bg-indigo-100 text-indigo-800',
  awaiting_planning_sign_off: 'bg-violet-100 text-violet-800',
  wayleave_pending: 'bg-amber-100 text-amber-800',
  wayleave_approved: 'bg-indigo-100 text-indigo-800',
  scheduled: 'bg-purple-100 text-purple-800',
  complete: 'bg-green-100 text-green-800',
  on_hold: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

/** Solid segment fills for pipeline progress bar */
export const STATUS_BAR_SEGMENT_COLORS = {
  order_placed: 'bg-blue-500',
  awaiting_cx_creation: 'bg-sky-500',
  awaiting_site_survey_scheduling: 'bg-cyan-500',
  site_survey_scheduled: 'bg-teal-500',
  awaiting_planning_documents: 'bg-indigo-500',
  awaiting_planning_sign_off: 'bg-violet-500',
  wayleave_pending: 'bg-amber-500',
  wayleave_approved: 'bg-indigo-600',
  scheduled: 'bg-purple-500',
  complete: 'bg-green-500',
  on_hold: 'bg-orange-400',
  cancelled: 'bg-gray-400',
};

/** Timeline highlight border + subtle fill */
export const STATUS_BORDER_STYLES = {
  order_placed: 'border-blue-400 bg-blue-50/80',
  awaiting_cx_creation: 'border-sky-400 bg-sky-50/80',
  awaiting_site_survey_scheduling: 'border-cyan-400 bg-cyan-50/80',
  site_survey_scheduled: 'border-teal-400 bg-teal-50/80',
  awaiting_planning_documents: 'border-indigo-400 bg-indigo-50/80',
  awaiting_planning_sign_off: 'border-violet-400 bg-violet-50/80',
  wayleave_pending: 'border-amber-400 bg-amber-50/80',
  wayleave_approved: 'border-indigo-400 bg-indigo-50/80',
  scheduled: 'border-purple-400 bg-purple-50/80',
  complete: 'border-green-400 bg-green-50/80',
  on_hold: 'border-orange-400 bg-orange-50/80',
  cancelled: 'border-gray-400 bg-gray-50/80',
};

/** Format weeks remaining/overdue for display (weeksRemaining: positive = left, negative = overdue) */
export function formatWeeksRemaining(weeksRemaining) {
  if (weeksRemaining === 0) return '0 weeks';
  const abs = Math.abs(weeksRemaining);
  const unit = abs === 1 ? 'week' : 'weeks';
  if (weeksRemaining < 0) return `${abs} ${unit} overdue`;
  return `${abs} ${unit} remaining`;
}
