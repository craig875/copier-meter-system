import { MODULE_COPERS, MODULE_CONNECTIVITY, MODULE_FIBRE_ORDERS, MODULE_INSTALLATIONS } from '../utils/permissions.js';

/**
 * Inbox categories users can mute. Missing preference rows mean enabled.
 */
export const NOTIFICATION_CATEGORIES = Object.freeze([
  {
    key: 'copiers',
    moduleKey: MODULE_COPERS,
    label: 'Copiers',
    description: 'Reading notes, part orders, and Unable-to-obtain override requests',
    types: ['reading_note_added', 'part_order_captured', 'unable_to_obtain_override_requested'],
  },
  {
    key: 'connectivity',
    moduleKey: MODULE_CONNECTIVITY,
    label: 'Connectivity',
    description: 'Link down, restored, and DNS failure alerts',
    types: ['connectivity_link_down', 'connectivity_link_restored', 'connectivity_dns_failure'],
  },
  {
    key: 'fibre_orders',
    moduleKey: MODULE_FIBRE_ORDERS,
    label: 'Fibre orders',
    description: 'Sales agent update requests on fibre orders',
    types: ['fibre_order_update_requested'],
  },
  {
    key: 'installations',
    moduleKey: MODULE_INSTALLATIONS,
    label: 'Installations',
    description: 'Tasks assigned to you',
    types: ['install_task_assigned'],
  },
]);

const TYPE_TO_CATEGORY = Object.fromEntries(
  NOTIFICATION_CATEGORIES.flatMap((cat) => cat.types.map((type) => [type, cat.key]))
);

const CATEGORY_KEYS = new Set(NOTIFICATION_CATEGORIES.map((c) => c.key));

export function isNotificationCategory(value) {
  return CATEGORY_KEYS.has(String(value || ''));
}

export function categoryForNotificationType(type) {
  return TYPE_TO_CATEGORY[type] || null;
}

export function categoriesAvailableToUser(user = {}) {
  const modules = new Set(user.modules || []);
  const allModules = user.role === 'admin' || user.assignedRole?.key === 'owner';
  return NOTIFICATION_CATEGORIES.filter((cat) => {
    if (allModules) return true;
    if (modules.has(cat.moduleKey)) return true;
    if (cat.key === 'installations' && (user.permissions || []).includes('installations.tasks.view_own')) {
      return true;
    }
    return false;
  });
}
