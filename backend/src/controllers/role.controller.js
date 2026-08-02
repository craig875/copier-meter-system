import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Role HTTP layer — delegates to RoleService; audits mutations like Users CRUD.
 */
export class RoleController {
  constructor(roleService = services.role, auditService = services.audit) {
    this.roleService = roleService;
    this.auditService = auditService;
  }

  listRoles = asyncHandler(async (req, res) => {
    const result = await this.roleService.listRoles();
    res.json(result);
  });

  getRole = asyncHandler(async (req, res) => {
    const result = await this.roleService.getRole(req.params.id);
    res.json(result);
  });

  updateRole = asyncHandler(async (req, res) => {
    const { role, auditDetails } = await this.roleService.updateRole(
      req.params.id,
      req.body,
      req.user.permissions
    );
    this.auditService.log(req.user.id, 'role_update', 'role', role.id, auditDetails);
    res.json({ role });
  });
}

const roleController = new RoleController();

export const listRoles = roleController.listRoles.bind(roleController);
export const getRole = roleController.getRole.bind(roleController);
export const updateRole = roleController.updateRole.bind(roleController);
