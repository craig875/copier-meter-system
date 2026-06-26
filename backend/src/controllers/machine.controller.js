import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { hasAdminAccess } from '../utils/permissions.js';
import { resolveAppSite, assertMachineInSite } from '../utils/app-site.util.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Machine Controller - HTTP request/response handling for machines
 * Single Responsibility: HTTP layer only - delegates to service layer
 */
export class MachineController {
  constructor(machineService = services.machine, auditService = services.audit) {
    this.machineService = machineService;
    this.auditService = auditService;
  }

  assertMachineAccess(req, machine) {
    const site = resolveAppSite(req);
    assertMachineInSite(machine, site);
  }

  getMachines = asyncHandler(async (req, res) => {
    const { branch: _queryBranch, ...filters } = req.query;
    const site = resolveAppSite(req);
    const result = await this.machineService.getMachines({ ...filters, branch: site });
    res.json({ ...result, site });
  });

  getMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const machine = await this.machineService.getMachine(id);
    this.assertMachineAccess(req, machine.machine);
    res.json(machine);
  });

  createMachine = asyncHandler(async (req, res) => {
    const site = resolveAppSite(req);
    const machineData = { ...req.body, branch: site };
    const result = await this.machineService.createMachine(machineData);
    this.auditService.log(req.user.id, 'machine_create', 'machine', result.machine.id, {
      serialNumber: result.machine.machineSerialNumber,
      branch: site,
    });
    res.status(201).json(result);
  });

  updateMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await this.machineService.getMachine(id);
    this.assertMachineAccess(req, existing.machine);

    if (!hasAdminAccess(req.user.role) && req.body.branch) {
      if (req.user.role === 'meter_user' && !req.user.branch) {
        // meter user with all-branch access may change branch
      } else {
        throw new ForbiddenError('Only administrators can change machine branch');
      }
    }

    if (req.body.branch) {
      req.body.branch = hasAdminAccess(req.user.role)
        ? req.body.branch
        : (req.user.role === 'meter_user' && !req.user.branch)
          ? req.body.branch
          : req.user.branch || resolveAppSite(req);
    }

    const result = await this.machineService.updateMachine(id, req.body);
    this.auditService.log(req.user.id, 'machine_update', 'machine', id, { serialNumber: result.machine?.machineSerialNumber });
    res.json(result);
  });

  deleteMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await this.machineService.getMachine(id);
    this.assertMachineAccess(req, existing.machine);
    const result = await this.machineService.deleteMachine(id);
    this.auditService.log(req.user.id, 'machine_delete', 'machine', id, { serialNumber: existing?.machine?.machineSerialNumber });
    res.json(result);
  });

  decommissionMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await this.machineService.getMachine(id);
    this.assertMachineAccess(req, existing.machine);
    const result = await this.machineService.decommissionMachine(id);
    this.auditService.log(req.user.id, 'machine_decommission', 'machine', id, { serialNumber: existing?.machine?.machineSerialNumber });
    res.json(result);
  });

  recommissionMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await this.machineService.getMachine(id);
    this.assertMachineAccess(req, existing.machine);
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
