import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import routes from './routes/index.js';
import prisma from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';

const app = express();

// Middleware - CORS
app.use(cors({
  origin: config.nodeEnv === 'development' ? true : config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use(express.json());

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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
