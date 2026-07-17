export const INSTALL_TASK_STATUSES = ['assigned', 'acknowledged', 'complete'];

export const INSTALL_TASK_STATUS_LABELS = {
  assigned: 'Assigned',
  acknowledged: 'Acknowledged',
  complete: 'Complete',
};

export function installTaskStatusLabel(status) {
  return INSTALL_TASK_STATUS_LABELS[status] || status || '—';
}

/** True if `next` is strictly later in the Assigned → Acknowledged → Complete chain. */
export function isForwardTaskStatus(from, to) {
  const fromIdx = INSTALL_TASK_STATUSES.indexOf(from);
  const toIdx = INSTALL_TASK_STATUSES.indexOf(to);
  return fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx;
}
