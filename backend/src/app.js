import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import routes from './routes/index.js';
import prisma from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import { getMonitoringEngine } from './connectivity/monitoring/engine.js';

const app = express();

// Behind nginx: X-Forwarded-For is set — express-rate-limit requires trust proxy (see ERR_ERL_UNEXPECTED_X_FORWARDED_FOR).
// Use NODE_ENV === 'production' directly so this works even if config.trustProxy is ever out of sync.
const trustProxyOff = process.env.TRUST_PROXY === 'false' || process.env.TRUST_PROXY === '0';
if (!trustProxyOff && (config.nodeEnv === 'production' || config.trustProxy)) {
  app.set('trust proxy', 1);
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware - CORS
app.use(cors({
  origin: config.nodeEnv === 'development'
    ? true
    : (origin, cb) => {
        if (!origin) return cb(null, true);
        const list =
          config.frontendOrigins?.length > 0
            ? config.frontendOrigins
            : [(config.frontendUrl || '').replace(/\/$/, '')].filter(Boolean);
        const allowed = list.some((a) => a && origin === a);
        if (allowed) return cb(null, origin);
        if (origin.includes('vercel.app')) return cb(null, origin);
        return cb(null, false);
      },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use(express.json());

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path === '/health') {
    return next();
  }
  return apiLimiter(req, res, next);
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Systems API',
    version: '1.0.0',
    status: 'running',
    platform: {
      name: 'Systems',
      description: 'Unified platform for managing multiple internal business processes',
      modules: [
        {
          id: 'meter-readings',
          name: 'Meter Readings',
          endpoints: {
            machines: '/api/machines',
            readings: '/api/readings'
          }
        }
      ]
    },
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/login',
      dashboard: '/api/dashboard'
    }
  });
});

// API Routes
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  next(new NotFoundError('Route'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const start = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully');

    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Trust proxy: ${app.get('trust proxy') ?? 'off'}`);
      if (config.connectivityModuleEnabled) {
        getMonitoringEngine().start();
        console.log('Connectivity monitoring engine started');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

// Graceful shutdown
process.on('SIGINT', async () => {
  if (config.connectivityModuleEnabled) {
    getMonitoringEngine().stop();
  }
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (config.connectivityModuleEnabled) {
    getMonitoringEngine().stop();
  }
  await prisma.$disconnect();
  process.exit(0);
});
