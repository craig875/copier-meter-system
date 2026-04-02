import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  /** When true, Express trusts X-Forwarded-* from the first proxy (e.g. nginx). Required for express-rate-limit behind a reverse proxy. Set TRUST_PROXY=false to disable. */
  trustProxy:
    process.env.TRUST_PROXY === 'false' || process.env.TRUST_PROXY === '0'
      ? false
      : process.env.TRUST_PROXY === 'true' ||
        process.env.TRUST_PROXY === '1' ||
        (process.env.NODE_ENV || 'development') === 'production',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  connectivityModuleEnabled: process.env.CONNECTIVITY_MODULE_ENABLED !== 'false',
};
