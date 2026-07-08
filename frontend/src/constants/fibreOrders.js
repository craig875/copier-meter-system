/** 20 sequential pipeline stages — keep in sync with backend FibrePipelineStatus */
export const PIPELINE_STATUSES = [
  { value: 'order_placed', label: 'Order Placed' },
  { value: 'awaiting_cx_number', label: 'Awaiting CX Number' },
  { value: 'awaiting_site_survey_scheduling', label: 'Awaiting Site Survey Scheduling' },
  { value: 'site_survey_scheduled', label: 'Site Survey Scheduled' },
  { value: 'site_survey_complete', label: 'Site Survey Complete' },
  { value: 'planning_documents_unsigned', label: 'Planning Documents Received - Unsigned' },
  { value: 'planning_documents_signed', label: 'Planning Documents Received - Signed Off' },
  { value: 'wayleave_pending', label: 'Wayleave Pending' },
  { value: 'wayleave_approved', label: 'Wayleave Approved' },
  { value: 'awaiting_installation_date', label: 'Awaiting Installation Date' },
  { value: 'installation_date_received', label: 'Installation Date Received' },
  { value: 'installation_in_progress', label: 'Installation in Progress' },
  { value: 'installation_complete', label: 'Installation Complete' },
  { value: 'awaiting_fno_cpe_installation', label: 'Awaiting FNO CPE Installation' },
  { value: 'awaiting_atc_testing_date', label: 'Awaiting ATC Testing Date' },
  { value: 'atc_testing_complete', label: 'ATC Testing Complete' },
  { value: 'awaiting_handover', label: 'Awaiting Handover' },
  { value: 'handover_received', label: 'Handover Received' },
  { value: 'awaiting_cutover', label: 'Awaiting Cutover' },
  { value: 'complete', label: 'Complete' },
];

/** Overlay flags — sit on top of pipeline stage; null = none */
export const OVERLAY_STATUSES = [
  { value: 'wip', label: 'WIP' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PIPELINE_STATUS_VALUES = PIPELINE_STATUSES.map((s) => s.value);

export const PIPELINE_TERMINAL = 'complete';

/** Active list filter — all pipeline stages except terminal complete */
export const ACTIVE_PIPELINE_STATUSES = PIPELINE_STATUSES.filter(
  (s) => s.value !== PIPELINE_TERMINAL
);

/** Late pipeline stages (16–19) for dashboard "almost complete" tile */
export const ALMOST_COMPLETE_STATUSES = [
  'atc_testing_complete',
  'awaiting_handover',
  'handover_received',
  'awaiting_cutover',
];

export const isActiveFibreOrder = (order) => {
  if (!order) return false;
  if (order.pipelineStatus === PIPELINE_TERMINAL) return false;
  if (order.overlayStatus === 'cancelled') return false;
  return true;
};

export const isCompletedFibreOrder = (order) => order?.pipelineStatus === PIPELINE_TERMINAL;

export const pipelineStatusLabel = (status) =>
  PIPELINE_STATUSES.find((s) => s.value === status)?.label
  ?? status?.replace(/_/g, ' ')
  ?? status;

export const overlayStatusLabel = (status) =>
  OVERLAY_STATUSES.find((s) => s.value === status)?.label
  ?? status?.replace(/_/g, ' ')
  ?? status;

/** @deprecated use pipelineStatusLabel — kept for timeline strings */
export const statusLabel = pipelineStatusLabel;

export const PIPELINE_BADGE_STYLES = {
  order_placed: 'bg-blue-100 text-blue-800',
  awaiting_cx_number: 'bg-sky-100 text-sky-800',
  awaiting_site_survey_scheduling: 'bg-cyan-100 text-cyan-800',
  site_survey_scheduled: 'bg-teal-100 text-teal-800',
  site_survey_complete: 'bg-emerald-100 text-emerald-800',
  planning_documents_unsigned: 'bg-indigo-100 text-indigo-800',
  planning_documents_signed: 'bg-violet-100 text-violet-800',
  wayleave_pending: 'bg-amber-100 text-amber-800',
  wayleave_approved: 'bg-yellow-100 text-yellow-800',
  awaiting_installation_date: 'bg-orange-100 text-orange-800',
  installation_date_received: 'bg-rose-100 text-rose-800',
  installation_in_progress: 'bg-pink-100 text-pink-800',
  installation_complete: 'bg-fuchsia-100 text-fuchsia-800',
  awaiting_fno_cpe_installation: 'bg-purple-100 text-purple-800',
  awaiting_atc_testing_date: 'bg-violet-100 text-violet-800',
  atc_testing_complete: 'bg-indigo-100 text-indigo-800',
  awaiting_handover: 'bg-blue-100 text-blue-800',
  handover_received: 'bg-sky-100 text-sky-800',
  awaiting_cutover: 'bg-cyan-100 text-cyan-800',
  complete: 'bg-green-100 text-green-800',
};

export const OVERLAY_BADGE_STYLES = {
  wip: 'bg-blue-100 text-blue-900 ring-1 ring-blue-300',
  on_hold: 'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
  cancelled: 'bg-gray-100 text-gray-600 ring-1 ring-gray-300',
};

/** Solid segment fills for pipeline progress bar */
export const STATUS_BAR_SEGMENT_COLORS = {
  order_placed: 'bg-blue-500',
  awaiting_cx_number: 'bg-sky-500',
  awaiting_site_survey_scheduling: 'bg-cyan-500',
  site_survey_scheduled: 'bg-teal-500',
  site_survey_complete: 'bg-emerald-500',
  planning_documents_unsigned: 'bg-indigo-500',
  planning_documents_signed: 'bg-violet-500',
  wayleave_pending: 'bg-amber-500',
  wayleave_approved: 'bg-yellow-500',
  awaiting_installation_date: 'bg-orange-500',
  installation_date_received: 'bg-rose-500',
  installation_in_progress: 'bg-pink-500',
  installation_complete: 'bg-fuchsia-500',
  awaiting_fno_cpe_installation: 'bg-purple-500',
  awaiting_atc_testing_date: 'bg-violet-500',
  atc_testing_complete: 'bg-indigo-600',
  awaiting_handover: 'bg-blue-600',
  handover_received: 'bg-sky-600',
  awaiting_cutover: 'bg-cyan-600',
  complete: 'bg-green-500',
};

export const OVERLAY_BAR_RING_STYLES = {
  wip: 'ring-2 ring-blue-400/70',
  on_hold: 'ring-2 ring-orange-400/80',
  cancelled: 'ring-2 ring-gray-400/80 opacity-60',
};

/** Timeline highlight border + subtle fill (pipeline stage) */
export const STATUS_BORDER_STYLES = {
  order_placed: 'border-blue-400 bg-blue-50/80',
  awaiting_cx_number: 'border-sky-400 bg-sky-50/80',
  awaiting_site_survey_scheduling: 'border-cyan-400 bg-cyan-50/80',
  site_survey_scheduled: 'border-teal-400 bg-teal-50/80',
  site_survey_complete: 'border-emerald-400 bg-emerald-50/80',
  planning_documents_unsigned: 'border-indigo-400 bg-indigo-50/80',
  planning_documents_signed: 'border-violet-400 bg-violet-50/80',
  wayleave_pending: 'border-amber-400 bg-amber-50/80',
  wayleave_approved: 'border-yellow-400 bg-yellow-50/80',
  awaiting_installation_date: 'border-orange-400 bg-orange-50/80',
  installation_date_received: 'border-rose-400 bg-rose-50/80',
  installation_in_progress: 'border-pink-400 bg-pink-50/80',
  installation_complete: 'border-fuchsia-400 bg-fuchsia-50/80',
  awaiting_fno_cpe_installation: 'border-purple-400 bg-purple-50/80',
  awaiting_atc_testing_date: 'border-violet-400 bg-violet-50/80',
  atc_testing_complete: 'border-indigo-400 bg-indigo-50/80',
  awaiting_handover: 'border-blue-400 bg-blue-50/80',
  handover_received: 'border-sky-400 bg-sky-50/80',
  awaiting_cutover: 'border-cyan-400 bg-cyan-50/80',
  complete: 'border-green-400 bg-green-50/80',
};

export function formatOrderUpdateStatusChange(update) {
  if (!update) return null;
  const parts = [];

  if (
    update.newPipelineStatus &&
    update.previousPipelineStatus !== update.newPipelineStatus
  ) {
    const prev = update.previousPipelineStatus
      ? pipelineStatusLabel(update.previousPipelineStatus)
      : '—';
    parts.push(`Pipeline: ${prev} → ${pipelineStatusLabel(update.newPipelineStatus)}`);
  }

  if (update.previousOverlayStatus !== update.newOverlayStatus) {
    if (update.newOverlayStatus) {
      const prev = update.previousOverlayStatus
        ? overlayStatusLabel(update.previousOverlayStatus)
        : 'None';
      parts.push(`Overlay: ${prev} → ${overlayStatusLabel(update.newOverlayStatus)}`);
    } else if (update.previousOverlayStatus) {
      parts.push('Overlay cleared');
    }
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function hasOrderUpdateStatusChange(update) {
  if (!update) return false;
  if (
    update.newPipelineStatus &&
    update.previousPipelineStatus !== update.newPipelineStatus
  ) {
    return true;
  }
  return update.previousOverlayStatus !== update.newOverlayStatus;
}

/** Format weeks remaining/overdue for display (weeksRemaining: positive = left, negative = overdue) */
export function formatWeeksRemaining(weeksRemaining) {
  if (weeksRemaining === 0) return '0 weeks';
  const abs = Math.abs(weeksRemaining);
  const unit = abs === 1 ? 'week' : 'weeks';
  if (weeksRemaining < 0) return `${abs} ${unit} overdue`;
  return `${abs} ${unit} remaining`;
}
