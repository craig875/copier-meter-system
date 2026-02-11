import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Dashboard route requires authentication
router.use(authenticate);
router.get('/', getDashboard);

export default router;
