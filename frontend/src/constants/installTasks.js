export const INSTALL_TASK_STATUSES = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'complete', label: 'Complete' },
];

export const INSTALL_TASK_STATUS_LABELS = Object.fromEntries(
  INSTALL_TASK_STATUSES.map((s) => [s.value, s.label])
);

export function installTaskStatusLabel(status) {
  return INSTALL_TASK_STATUS_LABELS[status] || status || '—';
}

export const INSTALL_TASK_STATUS_BADGE = {
  assigned: 'bg-amber-100 text-amber-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  complete: 'bg-green-100 text-green-800',
};

const ORDER = ['assigned', 'acknowledged', 'complete'];

/** Next statuses the user may choose (forward only). */
export function nextInstallTaskStatuses(current) {
  const idx = ORDER.indexOf(current);
  if (idx === -1 || idx === ORDER.length - 1) return [];
  return ORDER.slice(idx + 1).map((value) => ({
    value,
    label: INSTALL_TASK_STATUS_LABELS[value],
  }));
}
