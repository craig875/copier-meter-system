/** Fibre order pipeline stages (sequential, 1–20). Keep in sync with Prisma FibrePipelineStatus. */
export const FIBRE_PIPELINE_STATUSES = [
  'order_placed',
  'awaiting_cx_number',
  'awaiting_site_survey_scheduling',
  'site_survey_scheduled',
  'site_survey_complete',
  'planning_documents_unsigned',
  'planning_documents_signed',
  'wayleave_pending',
  'wayleave_approved',
  'awaiting_installation_date',
  'installation_date_received',
  'installation_in_progress',
  'installation_complete',
  'awaiting_fno_cpe_installation',
  'awaiting_atc_testing_date',
  'atc_testing_complete',
  'awaiting_handover',
  'handover_received',
  'awaiting_cutover',
  'complete',
];

/** Overlay flags — apply on top of pipeline stage; null = no overlay. */
export const FIBRE_OVERLAY_STATUSES = ['wip', 'on_hold', 'cancelled'];

export const FIBRE_PIPELINE_TERMINAL = 'complete';

/** Late pipeline stages for dashboard "almost complete" tile (stages 16–19) */
export const FIBRE_ALMOST_COMPLETE_PIPELINE_STATUSES = [
  'atc_testing_complete',
  'awaiting_handover',
  'handover_received',
  'awaiting_cutover',
];

export function isActiveFibreOrderRecord(order) {
  if (!order) return false;
  if (order.pipelineStatus === FIBRE_PIPELINE_TERMINAL) return false;
  if (order.overlayStatus === 'cancelled') return false;
  return true;
}

export function isCompletedFibreOrderRecord(order) {
  return order?.pipelineStatus === FIBRE_PIPELINE_TERMINAL;
}
