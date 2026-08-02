import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getPermissionCatalogGrouped } from '../permissions/catalog.js';

/**
 * Permission catalog + effective-permission preview — read-only, no audit.
 */
export class PermissionPreviewController {
  constructor(previewService = services.permissionPreview) {
    this.previewService = previewService;
  }

  getCatalog = asyncHandler(async (req, res) => {
    res.json(getPermissionCatalogGrouped());
  });

  preview = asyncHandler(async (req, res) => {
    const result = await this.previewService.preview(req.body);
    res.json(result);
  });
}

const permissionPreviewController = new PermissionPreviewController();

export const getCatalog =
  permissionPreviewController.getCatalog.bind(permissionPreviewController);
export const preview =
  permissionPreviewController.preview.bind(permissionPreviewController);
