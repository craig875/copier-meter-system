/**
 * PM2 config — run from repo root: pm2 start ecosystem.config.cjs
 * Ensures NODE_ENV=production (trust proxy + production behavior).
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'copier-api',
      cwd: path.join(__dirname, 'backend'),
      script: 'src/app.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
