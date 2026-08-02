import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from '../config/database.js';
import { computeEffectivePermissions } from '../permissions/effectivePermissions.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        roleId: true,
        branch: true,
        modules: true,
        assignedRole: {
          select: {
            id: true,
            key: true,
            name: true,
            permissions: { select: { permissionKey: true } },
          },
        },
        permissionOverrides: {
          select: { permissionKey: true, effect: true },
        },
        branchAccess: { select: { branch: true }, orderBy: { branch: 'asc' } },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { branchAccess, assignedRole, permissionOverrides, ...userFields } = user;
    const permissions = computeEffectivePermissions({
      roleKey: assignedRole?.key,
      rolePermissionKeys: (assignedRole?.permissions ?? []).map((p) => p.permissionKey),
      overrides: permissionOverrides ?? [],
      modules: user.modules ?? [],
    });

    req.user = {
      ...userFields,
      allowedBranches: branchAccess.map((a) => a.branch),
      assignedRole: assignedRole
        ? { id: assignedRole.id, key: assignedRole.key, name: assignedRole.name }
        : null,
      permissions,
    };
    next();
  } catch (error) {
    // Log the error for debugging - make it very visible
    console.error('\n========== AUTHENTICATION ERROR ==========');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Request URL:', req.originalUrl);
    console.error('Request Method:', req.method);
    console.error('==========================================\n');

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    // For other errors (like database errors), return 500 with more details in development
    return res.status(500).json({ 
      error: 'Authentication failed',
      ...(process.env.NODE_ENV !== 'production' && { 
        details: error.message,
        name: error.name,
        stack: error.stack
      })
    });
  }
};

/**
 * Elevated access: role is admin OR manager (not admin-only).
 * Error body already says "Administrator or manager access required".
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    return res.status(403).json({ error: 'Administrator or manager access required' });
  }
  next();
};

export const requireMeterOrAdmin = (req, res, next) => {
  if (!['admin', 'manager', 'meter_user'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Admin or meter user access required' });
  }
  next();
};

/** Excludes capturer - for machine create/update, etc. */
export const requireMeterUserOrAdmin = (req, res, next) => {
  if (!['admin', 'manager', 'meter_user'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Admin or meter user access required' });
  }
  next();
};
