import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Auth Controller - HTTP request/response handling for authentication
 * Single Responsibility: HTTP layer only - delegates to service layer
 */
export class AuthController {
  constructor(authService = services.auth, userService = services.user) {
    this.authService = authService;
    this.userService = userService;
  }

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password);
    res.json(result);
  });

  getMe = asyncHandler(async (req, res) => {
    const result = await this.authService.getCurrentUser(req.user.id);
    res.json(result);
  });

  getUsers = asyncHandler(async (req, res) => {
    const result = await this.userService.getUsers();
    res.json(result);
  });

  createUser = asyncHandler(async (req, res) => {
    const result = await this.userService.createUser(req.body);
    res.status(201).json(result);
  });

  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.userService.updateUser(id, req.body);
    res.json(result);
  });

  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.userService.deleteUser(id, req.user.id);
    res.json(result);
  });
}

// Export singleton instance
const authController = new AuthController();

// Export individual functions for backward compatibility
export const login = authController.login.bind(authController);
export const getMe = authController.getMe.bind(authController);
export const getUsers = authController.getUsers.bind(authController);
export const createUser = authController.createUser.bind(authController);
export const updateUser = authController.updateUser.bind(authController);
export const deleteUser = authController.deleteUser.bind(authController);
