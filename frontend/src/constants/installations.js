export const INSTALL_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'complete', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const INSTALL_STATUS_LABELS = Object.fromEntries(
  INSTALL_STATUSES.map((s) => [s.value, s.label])
);

export function installStatusLabel(status) {
  return INSTALL_STATUS_LABELS[status] || status || '—';
}

export const INSTALL_STATUS_BADGE = {
  active: 'bg-green-100 text-green-800',
  on_hold: 'bg-amber-100 text-amber-800',
  complete: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-600',
};
