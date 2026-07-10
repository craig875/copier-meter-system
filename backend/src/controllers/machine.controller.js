import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { assertRecordInTenant } from '../middleware/tenant.js';

/**
 * Machine Controller - HTTP request/response handling for machines
 */
export class MachineController {
  constructor(machineService = services.machine, auditService = services.audit) {
    this.machineService = machineService;
    this.auditService = auditService;
  }

  getMachines = asyncHandler(async (req, res) => {
    const { branch: _ignored, ...filters } = req.query;
    const result = await this.machineService.getMachines({
      ...filters,
      branch: req.tenantBranch,
    });
    res.json(result);
  });

  getMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const machine = await this.machineService.getMachine(id);
    assertRecordInTenant(machine?.machine, req.tenantBranch, 'Machine');
    res.json(machine);
  });

  createMachine = asyncHandler(async (req, res) => {
    const machineData = { ...req.body, branch: req.tenantBranch };
    const result = await this.machineService.createMachine(machineData);
    this.auditService.log(req.user.id, 'machine_create', 'machine', result.machine.id, {
      serialNumber: result.machine.machineSerialNumber,
      branch: req.tenantBranch,
    });
    res.status(201).json(result);
  });

  updateMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await this.machineService.getMachine(id);
    assertRecordInTenant(existing?.machine, req.tenantBranch, 'Machine');

    const { branch: _ignored, ...rest } = req.body;
    const result = await this.machineService.updateMachine(id, rest);
    this.auditService.log(req.user.id, 'machine_update', 'machine', id, {
      serialNumber: result.machine?.machineSerialNumber,
    });
    res.json(result);
  });

  deleteMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await this.machineService.getMachine(id);
    assertRecordInTenant(existing?.machine, req.tenantBranch, 'Machine');

    const result = await this.machineService.deleteMachine(id);
    this.auditService.log(req.user.id, 'machine_delete', 'machine', id, {
      serialNumber: existing?.machine?.machineSerialNumber,
    });
    res.json(result);
  });

  decommissionMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await this.machineService.getMachine(id);
    assertRecordInTenant(existing?.machine, req.tenantBranch, 'Machine');

    const result = await this.machineService.decommissionMachine(id);
    this.auditService.log(req.user.id, 'machine_decommission', 'machine', id, {
      serialNumber: existing?.machine?.machineSerialNumber,
    });
    res.json(result);
  });

  recommissionMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await this.machineService.getMachine(id);
    assertRecordInTenant(existing?.machine, req.tenantBranch, 'Machine');

    const result = await this.machineService.recommissionMachine(id);
    this.auditService.log(req.user.id, 'machine_recommission', 'machine', id, {
      serialNumber: existing?.machine?.machineSerialNumber,
    });
    res.json(result);
  });
}

const machineController = new MachineController();

export const getMachines = machineController.getMachines.bind(machineController);
export const getMachine = machineController.getMachine.bind(machineController);
export const createMachine = machineController.createMachine.bind(machineController);
export const updateMachine = machineController.updateMachine.bind(machineController);
export const deleteMachine = machineController.deleteMachine.bind(machineController);
export const decommissionMachine = machineController.decommissionMachine.bind(machineController);
export const recommissionMachine = machineController.recommissionMachine.bind(machineController);
