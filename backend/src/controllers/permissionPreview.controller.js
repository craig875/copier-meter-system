import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Effective-permission preview — read-only, no audit.
 */
export class PermissionPreviewController {
  constructor(previewService = services.permissionPreview) {
    this.previewService = previewService;
  }

  preview = asyncHandler(async (req, res) => {
    const result = await this.previewService.preview(req.body);
    res.json(result);
  });
}

const permissionPreviewController = new PermissionPreviewController();

export const preview =
  permissionPreviewController.preview.bind(permissionPreviewController);
