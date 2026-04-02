import dotenv from 'dotenv';

dotenv.config();

/** Comma-separated extra allowed browser origins for CORS (e.g. www vs non-www, https). */
function buildFrontendOrigins() {
  const set = new Set();
  const add = (u) => {
    const x = (u || '').trim().replace(/\/$/, '');
    if (x) set.add(x);
  };
  add(process.env.FRONTEND_URL);
  for (const part of (process.env.FRONTEND_URLS || '').split(',')) add(part);
  return Array.from(set);
}

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
  /** All allowed CORS origins (FRONTEND_URL + FRONTEND_URLS). */
  frontendOrigins: buildFrontendOrigins(),
  databaseUrl: process.env.DATABASE_URL,
  connectivityModuleEnabled: process.env.CONNECTIVITY_MODULE_ENABLED !== 'false',
};
