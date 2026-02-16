import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import machineRoutes from './machine.routes.js';
import readingRoutes from './reading.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import auditRoutes from './audit.routes.js';
import consumableRoutes from './consumable.routes.js';
import makeModelRoutes from './makeModel.routes.js';
import customerRoutes from './customer.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

// Auth first (no authentication required for login)
router.use('/auth', authRoutes);

// Main dashboard (landing page after login)
router.use('/dashboard', dashboardRoutes);

// Meter Reading System routes
router.use('/machines', machineRoutes);
router.use('/customers', customerRoutes);
router.use('/readings', readingRoutes);

// Consumable Tracker
router.use('/consumables', consumableRoutes);

// Makes & Models (read for forms; CRUD via makeModel routes)
router.use('/', makeModelRoutes);

// Audit / Transaction history (admin only)
router.use('/audit', auditRoutes);

// User management
router.use('/users', userRoutes);

// Notifications (admin only)
router.use('/notifications', notificationRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
