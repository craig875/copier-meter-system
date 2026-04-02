# Deploy without manual steps

Two options: **push to `main`** (GitHub Actions SSHs in and runs the script), or **SSH once** and run **`./scripts/deploy.sh`** yourself.

## One-time server setup

1. Clone the repo (if not already):

   ```bash
   cd /var/www
   git clone https://github.com/YOUR_ORG/copier-meter-system.git
   cd copier-meter-system
   ```

2. Configure **backend** (unchanged from before):

   - `backend/.env` with `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`, etc.

3. Configure **deploy** (frontend build only):

   ```bash
   cp deploy.env.example deploy.env
   nano deploy.env   # set VITE_API_URL to your public site origin, e.g. https://app.example.com
   ```

4. Make the script executable:

   ```bash
   chmod +x scripts/deploy.sh
   ```

5. **First deploy** (installs deps, builds, starts PM2):

   ```bash
   ./scripts/deploy.sh
   ```

6. Point **nginx** at:

   - API: `proxy_pass` to `http://127.0.0.1:3001` for `/api`
   - Static: `root` to `/var/www/copier-meter-system/frontend/dist` (or symlink)

## GitHub Actions (push to deploy)

1. On the server, ensure `deploy.env` exists and the repo path matches the workflow (`/var/www/copier-meter-system`). Edit `.github/workflows/deploy.yml` if your path differs.

2. Create an SSH key **only for deploy** (on your laptop):

   ```bash
   ssh-keygen -t ed25519 -f github-deploy -N ""
   ```

3. On the server, append **`github-deploy.pub`** to `~/.ssh/authorized_keys` for the user that will run deploy.

4. In GitHub: **Settings → Secrets and variables → Actions**, add:

   | Secret           | Value                                      |
   |------------------|--------------------------------------------|
   | `DEPLOY_HOST`    | Server hostname or IP                      |
   | `DEPLOY_USER`    | SSH user                                   |
   | `DEPLOY_SSH_KEY` | Contents of **`github-deploy`** (private) |

5. Push to **`main`** — the workflow runs `./scripts/deploy.sh` on the server.

You can also run the workflow manually: **Actions → Deploy to server → Run workflow**.

## What `deploy.sh` does

- `git fetch` + `git reset --hard origin/main` (server matches GitHub; no local edits on tracked files)
- Backend: `npm ci`, `prisma migrate deploy`
- Frontend: `npm ci`, `npm run build` with `VITE_API_URL` from `deploy.env`
- PM2: starts/restarts **`copier-api`** from **`ecosystem.config.cjs`** with `NODE_ENV=production`

## Notes

- **`deploy.env`** is gitignored — keep it only on the server.
- If you need local changes on the server, don’t use `reset --hard`; use `git pull` in the script instead (we can switch if you prefer).
- **Meter readings / DB**: still only what Prisma migrations apply; back up PostgreSQL before major upgrades.
