/** Align with backend `utils/permissions.js` — add keys when new modules ship */
export const MODULE_COPERS = 'copiers';
export const MODULE_CONNECTIVITY = 'connectivity';

export const MODULE_OPTIONS = [
  { key: MODULE_COPERS, label: 'Copiers', description: 'Meter readings, customers, consumables' },
  { key: MODULE_CONNECTIVITY, label: 'Connectivity', description: 'Link monitoring, SLA, alerts' },
];
