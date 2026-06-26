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
   | `DEPLOY_PATH`    | (Optional) Server path to repo if not `/var/www/copier-meter-system` |

5. Push to **`main`** — the workflow SSHs in and runs `./scripts/deploy.sh`.

   **Note:** If **`git push`** prints **“Everything up-to-date”**, you have **no new commit**; either **commit** your work first or open **Actions → Deploy to server → Run workflow** to redeploy the current `main`.

You can also run the workflow manually: **Actions → Deploy to server → Run workflow**.

### Repair catalog without SSH password

If you lost SSH login credentials but **DEPLOY_SSH_KEY** is set in GitHub Actions secrets, use:

**Actions → Repair catalog → Run workflow**

Choose **selective** (normal), **dry-run** (preview only), or **full** (one-time baseline — clones all JHB makes to CT).

This uses the same deploy key as **Deploy to server**; you do not need to copy the key from GitHub (secrets cannot be viewed after saving).

## Troubleshooting “deploy failed”

Open the failed job in **GitHub Actions** and read the **Deploy via SSH** log (the server prints `==>` lines from `deploy.sh`). Typical causes:

- **`ERROR: Set VITE_API_URL`** — create **`deploy.env`** on the server (see one-time setup).
- **`npm ci` / Prisma** — database unreachable, bad **`DATABASE_URL`** in **`backend/.env`**, or a migration failed (read the Prisma error in the log).
- **`npm run build` (frontend)** — fix the Vite error locally with `VITE_API_URL=… npm run build`, commit, push.
- **SSH / path** — wrong **`DEPLOY_HOST`**, key, or repo path; set secret **`DEPLOY_PATH`** or clone to **`/var/www/copier-meter-system`**.
- **Frontend on Vercel** — if your UI is deployed there, fix the **Vercel** build log; this workflow only updates your **PM2 + static `dist`** server setup.

## What `deploy.sh` does

- `git fetch` + `git reset --hard origin/main` (server matches GitHub; no local edits on tracked files)
- Backend: `npm ci`, `prisma migrate deploy`
- Frontend: `npm ci`, `npm run build` with `VITE_API_URL` from `deploy.env`
- PM2: starts/restarts **`copier-api`** from **`ecosystem.config.cjs`** with `NODE_ENV=production`

## Notes

- **`deploy.env`** is gitignored — keep it only on the server.
- If you need local changes on the server, don’t use `reset --hard`; use `git pull` in the script instead (we can switch if you prefer).
- **Meter readings / DB**: still only what Prisma migrations apply; back up PostgreSQL before major upgrades.
