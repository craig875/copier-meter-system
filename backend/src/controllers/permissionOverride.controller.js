import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Permission-override HTTP layer — audits upsert/delete like Users CRUD.
 */
export class PermissionOverrideController {
  constructor(
    overrideService = services.permissionOverride,
    auditService = services.audit
  ) {
    this.overrideService = overrideService;
    this.auditService = auditService;
  }

  listOverrides = asyncHandler(async (req, res) => {
    const result = await this.overrideService.list(req.params.userId);
    res.json(result);
  });

  upsertOverride = asyncHandler(async (req, res) => {
    const { override, warnings, auditDetails } = await this.overrideService.upsert(
      req.params.userId,
      req.body,
      req.user.permissions,
      req.user.id
    );
    this.auditService.log(
      req.user.id,
      'permission_override_upsert',
      'user_permission_override',
      override.id,
      auditDetails
    );
    res.json({ override, warnings });
  });

  deleteOverride = asyncHandler(async (req, res) => {
    const permissionKey = decodeURIComponent(req.params.permissionKey);
    const { auditDetails } = await this.overrideService.delete(
      req.params.userId,
      permissionKey
    );
    this.auditService.log(
      req.user.id,
      'permission_override_delete',
      'user_permission_override',
      auditDetails.removedOverrideId,
      auditDetails
    );
    res.json({ success: true });
  });
}

const permissionOverrideController = new PermissionOverrideController();

export const listOverrides =
  permissionOverrideController.listOverrides.bind(permissionOverrideController);
export const upsertOverride =
  permissionOverrideController.upsertOverride.bind(permissionOverrideController);
export const deleteOverride =
  permissionOverrideController.deleteOverride.bind(permissionOverrideController);
