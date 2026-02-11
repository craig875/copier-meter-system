import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import machineRoutes from './machine.routes.js';
import readingRoutes from './reading.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

// Main dashboard (landing page after login)
router.use('/dashboard', dashboardRoutes);

// Meter Reading System routes
router.use('/machines', machineRoutes);
router.use('/readings', readingRoutes);

// Auth and user management
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
