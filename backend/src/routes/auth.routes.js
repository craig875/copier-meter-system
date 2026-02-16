import { Router } from 'express';
import {
  login,
  getMe,
  verify2FA,
  get2FAStatus,
  setup2FA,
  verify2FASetup,
  disable2FA,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  verify2FASchema,
  verifySetupSchema,
  disable2FASchema,
} from '../schemas/auth.schema.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/verify-2fa', validate(verify2FASchema), verify2FA);
router.get('/me', authenticate, getMe);
router.get('/2fa/status', authenticate, get2FAStatus);
router.post('/2fa/setup', authenticate, setup2FA);
router.post('/2fa/verify-setup', validate(verifySetupSchema), authenticate, verify2FASetup);
router.post('/2fa/disable', validate(disable2FASchema), authenticate, disable2FA);

export default router;
