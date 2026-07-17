import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from '../config/database.js';

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
        branch: true,
        modules: true,
        branchAccess: { select: { branch: true }, orderBy: { branch: 'asc' } },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { branchAccess, ...userFields } = user;
    req.user = {
      ...userFields,
      allowedBranches: branchAccess.map((a) => a.branch),
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

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    return res.status(403).json({ error: 'Administrator or manager access required' });
  }
  next();
};

/** Genuine admin role only (excludes manager). Prefer this over requireAdmin when managers must be blocked. */
export const requireStrictAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
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
