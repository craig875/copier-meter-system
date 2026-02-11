import { asyncHandler } from '../middleware/errorHandler.js';
import { getAccessibleModules, getModulesByCategory } from '../config/modules.js';

/**
 * Dashboard Controller - Main landing page after login
 * Single Responsibility: HTTP layer for dashboard navigation
 * 
 * This controller provides a unified dashboard for all platform modules.
 * Modules are dynamically loaded from the module registry.
 */
export class DashboardController {
  getDashboard = asyncHandler(async (req, res) => {
    const user = req.user;
    const userRole = user.role;
    
    // Get modules accessible to this user
    const accessibleModules = getAccessibleModules(userRole);
    const modulesByCategory = getModulesByCategory(userRole);
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole,
      },
      modules: accessibleModules,
      modulesByCategory,
      platform: {
        name: 'Systems',
        version: '1.0.0',
        description: 'Unified platform for managing internal business processes',
      },
      message: `Welcome, ${user.name}! Select a module to get started.`,
    });
  });
}

// Export singleton instance
const dashboardController = new DashboardController();

export const getDashboard = dashboardController.getDashboard.bind(dashboardController);
