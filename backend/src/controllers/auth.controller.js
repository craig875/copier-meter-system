import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Auth Controller - HTTP request/response handling for authentication
 * Single Responsibility: HTTP layer only - delegates to service layer
 */
export class AuthController {
  constructor(authService = services.auth, userService = services.user, auditService = services.audit) {
    this.authService = authService;
    this.userService = userService;
    this.auditService = auditService;
  }

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await this.authService.login(email, password);
      res.json(result);
    } catch (err) {
      // Re-throw known auth errors (UnauthorizedError → 401)
      if (err.statusCode && err.statusCode !== 500) throw err;
      // Log unexpected errors for debugging
      console.error('Login error:', err);
      throw err;
    }
  });

  getMe = asyncHandler(async (req, res) => {
    const result = await this.authService.getCurrentUser(req.user.id);
    res.json(result);
  });

  verify2FA = asyncHandler(async (req, res) => {
    const { tempToken, code } = req.body;
    const result = await this.authService.verify2FA(tempToken, code);
    res.json(result);
  });

  get2FAStatus = asyncHandler(async (req, res) => {
    const result = await this.authService.get2FAStatus(req.user.id);
    res.json(result);
  });

  setup2FA = asyncHandler(async (req, res) => {
    const result = await this.authService.setup2FA(req.user.id);
    res.json(result);
  });

  verify2FASetup = asyncHandler(async (req, res) => {
    const { code, secret } = req.body;
    const result = await this.authService.verify2FASetup(req.user.id, code, secret);
    res.json(result);
  });

  disable2FA = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const result = await this.authService.disable2FA(req.user.id, password);
    res.json(result);
  });

  getUsers = asyncHandler(async (req, res) => {
    const result = await this.userService.getUsers();
    res.json(result);
  });

  createUser = asyncHandler(async (req, res) => {
    const result = await this.userService.createUser(req.body);
    this.auditService.log(req.user.id, 'user_create', 'user', result.user?.id, { email: result.user?.email });
    res.status(201).json(result);
  });

  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.userService.updateUser(id, req.body);
    this.auditService.log(req.user.id, 'user_update', 'user', id, { email: result.user?.email });
    res.json(result);
  });

  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.userService.deleteUser(id, req.user.id);
    this.auditService.log(req.user.id, 'user_delete', 'user', id, {});
    res.json(result);
  });
}

// Export singleton instance
const authController = new AuthController();

// Export individual functions for backward compatibility
export const login = authController.login.bind(authController);
export const getMe = authController.getMe.bind(authController);
export const verify2FA = authController.verify2FA.bind(authController);
export const get2FAStatus = authController.get2FAStatus.bind(authController);
export const setup2FA = authController.setup2FA.bind(authController);
export const verify2FASetup = authController.verify2FASetup.bind(authController);
export const disable2FA = authController.disable2FA.bind(authController);
export const getUsers = authController.getUsers.bind(authController);
export const createUser = authController.createUser.bind(authController);
export const updateUser = authController.updateUser.bind(authController);
export const deleteUser = authController.deleteUser.bind(authController);
