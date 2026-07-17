import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class InstallController {
  constructor(installService = services.install) {
    this.installService = installService;
  }

  listTypes = asyncHandler(async (req, res) => {
    const types = await this.installService.listTypes();
    res.json({ types });
  });

  listInstalls = asyncHandler(async (req, res) => {
    const filters = {
      branch: req.tenantBranch,
      status: req.query.status,
      typeId: req.query.typeId,
      search: req.query.search,
      activeOnly: req.query.activeOnly,
      completedOnly: req.query.completedOnly,
    };
    const installs = await this.installService.listInstalls(filters);
    res.json({ installs });
  });

  getInstall = asyncHandler(async (req, res) => {
    const install = await this.installService.getInstallById(
      req.params.id,
      req.tenantBranch
    );
    res.json({ install });
  });

  getUpdates = asyncHandler(async (req, res) => {
    const updates = await this.installService.getUpdates(
      req.params.id,
      req.tenantBranch
    );
    res.json({ updates });
  });

  createInstall = asyncHandler(async (req, res) => {
    const install = await this.installService.createInstall(
      req.user,
      req.body,
      req.tenantBranch
    );
    res.status(201).json({ install });
  });

  updateInstall = asyncHandler(async (req, res) => {
    const install = await this.installService.updateInstall(
      req.user,
      req.params.id,
      req.body,
      req.tenantBranch
    );
    res.json({ install });
  });
}

const controller = new InstallController();
export const listInstallTypes = controller.listTypes.bind(controller);
export const listInstalls = controller.listInstalls.bind(controller);
export const getInstall = controller.getInstall.bind(controller);
export const getInstallUpdates = controller.getUpdates.bind(controller);
export const createInstall = controller.createInstall.bind(controller);
export const updateInstall = controller.updateInstall.bind(controller);
