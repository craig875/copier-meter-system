import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { hasAdminAccess } from '../utils/permissions.js';

/**
 * Machine Controller - HTTP request/response handling for machines
 * Single Responsibility: HTTP layer only - delegates to service layer
 */
export class MachineController {
  constructor(machineService = services.machine, auditService = services.audit) {
    this.machineService = machineService;
    this.auditService = auditService;
  }

  getMachines = asyncHandler(async (req, res) => {
    const { branch: queryBranch, ...filters } = req.query;
    
    // Handle string "null" or "undefined" from query params
    const cleanQueryBranch = queryBranch === 'null' || queryBranch === 'undefined' || queryBranch === '' 
      ? null 
      : queryBranch;
    
    // Admins can specify branch or see all if not specified
    // Non-admins use their branch, or see all if no branch assigned
    let branch = null;
    if (hasAdminAccess(req.user.role)) {
      branch = cleanQueryBranch || req.user.branch || null;
    } else {
      branch = req.user.branch || null;
    }
    
    console.log('getMachines - Query params:', { 
      queryBranch, 
      cleanQueryBranch,
      filters, 
      branch, 
      userRole: req.user.role,
      userBranch: req.user.branch 
    });
    
    const result = await this.machineService.getMachines({ ...filters, branch });
    res.json(result);
  });

  getMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const machine = await this.machineService.getMachine(id);
    
    // Enforce branch access: non-admins can only access machines from their branch (if they have one)
    // If no branch assigned, they can access all branches
    if (req.user.role !== 'admin' && req.user.branch && machine.machine.branch !== req.user.branch) {
      return res.status(403).json({ error: 'Access denied: Machine belongs to a different branch' });
    }
    
    res.json(machine);
  });

  createMachine = asyncHandler(async (req, res) => {
    // Enforce branch: 
    // - Admins can specify or use their branch
    // - Meter users can use their assigned branch, or any branch if no branch assigned (all branches access)
    // - Default to JHB if no branch is set
    let branch;
    if (hasAdminAccess(req.user.role)) {
      branch = req.body.branch || req.user.branch || 'JHB';
    } else if (req.user.role === 'meter_user') {
      // Meter users can create machines for their assigned branch, or any branch if no branch assigned
      if (req.user.branch) {
        // If they have a branch assigned, use it (ignore any branch they try to specify)
        branch = req.user.branch;
      } else {
        // If no branch assigned, they can specify any branch (all branches access)
        branch = req.body.branch || 'JHB';
      }
    } else {
      branch = req.user.branch || 'JHB';
    }

    const machineData = { ...req.body, branch };
    const result = await this.machineService.createMachine(machineData);
    this.auditService.log(req.user.id, 'machine_create', 'machine', result.machine.id, { serialNumber: result.machine.machineSerialNumber, branch });
    res.status(201).json(result);
  });

  updateMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check machine exists and user has access
    const existing = await this.machineService.getMachine(id);
    // If user has a branch assigned, they can only access machines from that branch
    // If no branch assigned, they can access all branches
    if (!hasAdminAccess(req.user.role) && req.user.branch && existing.machine.branch !== req.user.branch) {
      return res.status(403).json({ error: 'Access denied: Machine belongs to a different branch' });
    }
    
    // For non-admins, ensure they can't change branch or access machines from other branches
    // Meter users with no branch assigned can change branch (all branches access)
    if (!hasAdminAccess(req.user.role) && req.body.branch) {
      if (req.user.role === 'meter_user' && !req.user.branch) {
        // Meter user with no branch can change branch (all branches access)
        // Allow the branch change
      } else {
        // Meter users with a branch assigned, or other non-admins, cannot change branch
        return res.status(403).json({ error: 'Only administrators can change machine branch' });
      }
    }

    // If branch is being updated, validate it
    if (req.body.branch) {
      const branch = hasAdminAccess(req.user.role)
        ? req.body.branch 
        : (req.user.role === 'meter_user' && !req.user.branch)
          ? req.body.branch // Meter user with no branch can specify any branch
          : req.user.branch || 'JHB';
      
      req.body.branch = branch;
    }

    const result = await this.machineService.updateMachine(id, req.body);
    this.auditService.log(req.user.id, 'machine_update', 'machine', id, { serialNumber: result.machine?.machineSerialNumber });
    res.json(result);
  });

  deleteMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check machine exists and user has access
    const existing = await this.machineService.getMachine(id);
    // If user has a branch assigned, they can only access machines from that branch
    // If no branch assigned, they can access all branches
    if (!hasAdminAccess(req.user.role) && req.user.branch && existing.machine.branch !== req.user.branch) {
      return res.status(403).json({ error: 'Access denied: Machine belongs to a different branch' });
    }
    
    const result = await this.machineService.deleteMachine(id);
    this.auditService.log(req.user.id, 'machine_delete', 'machine', id, { serialNumber: existing?.machine?.machineSerialNumber });
    res.json(result);
  });

  decommissionMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check machine exists and user has access
    const existing = await this.machineService.getMachine(id);
    // If user has a branch assigned, they can only access machines from that branch
    // If no branch assigned, they can access all branches
    if (!hasAdminAccess(req.user.role) && req.user.branch && existing.machine.branch !== req.user.branch) {
      return res.status(403).json({ error: 'Access denied: Machine belongs to a different branch' });
    }
    
    const result = await this.machineService.decommissionMachine(id);
    this.auditService.log(req.user.id, 'machine_decommission', 'machine', id, { serialNumber: existing?.machine?.machineSerialNumber });
    res.json(result);
  });

  recommissionMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check machine exists and user has access
    const existing = await this.machineService.getMachine(id);
    // If user has a branch assigned, they can only access machines from that branch
    // If no branch assigned, they can access all branches
    if (!hasAdminAccess(req.user.role) && req.user.branch && existing.machine.branch !== req.user.branch) {
      return res.status(403).json({ error: 'Access denied: Machine belongs to a different branch' });
    }
    
    const result = await this.machineService.recommissionMachine(id);
    this.auditService.log(req.user.id, 'machine_recommission', 'machine', id, { serialNumber: existing?.machine?.machineSerialNumber });
    res.json(result);
  });
}

// Export singleton instance
const machineController = new MachineController();

export const getMachines = machineController.getMachines.bind(machineController);
export const getMachine = machineController.getMachine.bind(machineController);
export const createMachine = machineController.createMachine.bind(machineController);
export const updateMachine = machineController.updateMachine.bind(machineController);
export const deleteMachine = machineController.deleteMachine.bind(machineController);
export const decommissionMachine = machineController.decommissionMachine.bind(machineController);
export const recommissionMachine = machineController.recommissionMachine.bind(machineController);
