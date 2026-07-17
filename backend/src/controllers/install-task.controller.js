import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class InstallTaskController {
  constructor(taskService = services.installTask) {
    this.taskService = taskService;
  }

  listMyTasks = asyncHandler(async (req, res) => {
    const tasks = await this.taskService.listMyTasks(req.user, req.tenantBranch);
    res.json({ tasks });
  });

  listTasks = asyncHandler(async (req, res) => {
    const tasks = await this.taskService.listTasks(
      req.user,
      req.params.id,
      req.tenantBranch
    );
    res.json({ tasks });
  });

  createTask = asyncHandler(async (req, res) => {
    const task = await this.taskService.createTask(
      req.user,
      req.params.id,
      req.body,
      req.tenantBranch
    );
    res.status(201).json({ task });
  });

  updateTask = asyncHandler(async (req, res) => {
    const task = await this.taskService.updateTask(
      req.user,
      req.params.id,
      req.params.taskId,
      req.body,
      req.tenantBranch
    );
    res.json({ task });
  });

  updateTaskStatus = asyncHandler(async (req, res) => {
    const task = await this.taskService.updateTaskStatus(
      req.user,
      req.params.id,
      req.params.taskId,
      req.body.status,
      req.tenantBranch
    );
    res.json({ task });
  });

  deleteTask = asyncHandler(async (req, res) => {
    await this.taskService.deleteTask(
      req.user,
      req.params.id,
      req.params.taskId,
      req.tenantBranch
    );
    res.status(204).send();
  });
}

const controller = new InstallTaskController();
export const listMyInstallTasks = controller.listMyTasks.bind(controller);
export const listInstallTasks = controller.listTasks.bind(controller);
export const createInstallTask = controller.createTask.bind(controller);
export const updateInstallTask = controller.updateTask.bind(controller);
export const updateInstallTaskStatus = controller.updateTaskStatus.bind(controller);
export const deleteInstallTask = controller.deleteTask.bind(controller);
