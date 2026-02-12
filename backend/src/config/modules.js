/**
 * Module Registry - Centralized configuration for all platform modules
 * 
 * This file defines all available modules in the platform.
 * To add a new module, simply add it to the modules array below.
 * 
 * Each module should have:
 * - id: Unique identifier (kebab-case)
 * - name: Display name
 * - description: Brief description
 * - route: Frontend route path
 * - icon: Icon/emoji for UI
 * - enabled: Whether the module is active
 * - permissions: Who can access (all, admin, user)
 * - apiRoutes: Array of API route prefixes this module uses
 */

export const modules = [
  {
    id: 'meter-readings',
    name: 'Meter Readings',
    description: 'Capture and manage copier meter readings',
    route: '/meter-readings',
    icon: '📊',
    enabled: true,
    permissions: 'all',
    apiRoutes: ['/api/machines', '/api/readings'],
    category: 'Operations',
  },
  {
    id: 'consumables',
    name: 'Consumables',
    description: 'Track consumable parts, validate yield, calculate charges in Rand',
    route: '/consumables',
    icon: '🖨️',
    enabled: true,
    permissions: 'all',
    apiRoutes: ['/api/consumables', '/api/machines'],
    category: 'Operations',
  },
  // Future modules can be added here:
  // {
  //   id: 'inventory',
  //   name: 'Inventory Management',
  //   description: 'Track inventory and stock levels',
  //   route: '/inventory',
  //   icon: '📦',
  //   enabled: true,
  //   permissions: 'admin',
  //   apiRoutes: ['/api/inventory'],
  //   category: 'Operations',
  // },
];

/**
 * Get modules accessible by a user based on their role
 * @param {string} userRole - 'admin' or 'meter_user'
 * @returns {Array} Filtered modules
 */
export function getAccessibleModules(userRole) {
  return modules.filter(module => {
    if (!module.enabled) return false;
    
    // Meter users can access meter readings and consumables
    if (userRole === 'meter_user') {
      return ['meter-readings', 'consumables'].includes(module.id);
    }
    
    // Admins can access all modules
    if (userRole === 'admin') {
      return true;
    }
    
    if (module.permissions === 'all') return true;
    if (module.permissions === 'admin' && userRole === 'admin') return true;
    if (typeof module.permissions === 'function') {
      return module.permissions(userRole);
    }
    
    return false;
  });
}

/**
 * Get module by ID
 * @param {string} moduleId
 * @returns {Object|null}
 */
export function getModuleById(moduleId) {
  return modules.find(m => m.id === moduleId && m.enabled) || null;
}

/**
 * Get modules grouped by category
 * @param {string} userRole
 * @returns {Object} Modules grouped by category
 */
export function getModulesByCategory(userRole) {
  const accessibleModules = getAccessibleModules(userRole);
  const grouped = {};
  
  accessibleModules.forEach(module => {
    const category = module.category || 'Other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(module);
  });
  
  return grouped;
}
