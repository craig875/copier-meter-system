# Deploy for Your Organization - Meter Reading System

This guide walks you through deploying the Copier Meter System so people in your organization can log in and use it. **Estimated time: 20–30 minutes.**

---

## What You'll Get

- **Login page** – Users sign in with email and password
- **Two-Factor Authentication (2FA)** – Optional TOTP (Google Authenticator) for extra security
- **Capture screen** – Enter monthly meter readings
- **History** – View and export past readings
- **Machines** – Admins manage copier configurations
- **Users** – Admins create accounts for colleagues

**Default admin login after deployment:** `admin@example.com` / `admin123`  
**Important:** Change this password after first login.

---

## Prerequisites

- [GitHub](https://github.com) account (free)
- [Railway](https://railway.app) account (free tier: $5 credit/month)
- [Vercel](https://vercel.com) account (free)

---

## Step 1: Push Code to GitHub

If your code isn’t on GitHub yet:

```powershell
cd c:\Users\27620\copier-meter-system

# Initialize git (if needed)
git init

# Add and commit
git add .
git commit -m "Initial commit - Copier Meter System"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/copier-meter-system.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Railway

1. Go to **[railway.app](https://railway.app)** → Sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → choose `copier-meter-system`.
3. **Add PostgreSQL**
   - Click **+ New** → **Database** → **Add PostgreSQL**.
   - Open the new database, go to **Variables**, and copy `DATABASE_URL`.
4. **Configure backend**
   - Add a new service: **+ New** → **GitHub Repo** → select `copier-meter-system`.
   - In the new service: **Settings** → **Root Directory** → set to `backend`.
   - **Variables** → add:

| Variable        | Value                                                                 |
|----------------|-----------------------------------------------------------------------|
| `DATABASE_URL` | Paste the value from the PostgreSQL service                           |
| `JWT_SECRET`   | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV`     | `production`                                                          |
| `FRONTEND_URL` | `https://placeholder.vercel.app` (update after Step 3)                |
| `PORT`         | `3001`                                                                |

5. **Build**
   - In **Settings** → **Build**:
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npx prisma migrate deploy && npm start`
6. **Get public URL**
   - **Settings** → **Networking** → **Generate Domain**.
   - Copy the URL (e.g. `https://copier-meter-backend.up.railway.app`).
7. **Seed database** (creates admin user and sample data)
   - From your local machine, run:
     ```powershell
     cd c:\Users\27620\copier-meter-system\backend
     $env:DATABASE_URL="<paste DATABASE_URL from Railway Variables tab>"
     npm run db:seed
     ```
   - This creates: admin@example.com / admin123, sample machines, and test users.

---

## Step 3: Deploy Frontend to Vercel

1. Go to **[vercel.com](https://vercel.com)** → Sign in with GitHub.
2. **Add New** → **Project** → import `copier-meter-system`.
3. **Configure project**
   - **Root Directory**: `frontend`.
   - **Framework Preset**: Vite.
   - **Environment Variables** → add:

| Name           | Value                                                  |
|----------------|--------------------------------------------------------|
| `VITE_API_URL` | Your Railway backend URL (e.g. `https://copier-meter-backend.up.railway.app`) |

4. **Deploy** – Vercel builds and deploys automatically.
5. Copy your frontend URL (e.g. `https://copier-meter-system.vercel.app`).

---

## Step 4: Final Configuration

1. **Update backend CORS**
   - Railway → backend service → **Variables**.
   - Set `FRONTEND_URL` to your Vercel URL (e.g. `https://copier-meter-system.vercel.app`).
   - Redeploy: **Deployments** → **⋮** on latest deployment → **Redeploy**.

2. **Confirm URLs**
   - Frontend URL: `https://your-app.vercel.app`
   - Backend health: `https://your-backend.up.railway.app/api/health` → expect `{"status":"ok",...}`

---

## Step 5: Add Users and Go Live

1. Open the frontend URL in a browser.
2. Log in with `admin@example.com` / `admin123`.
3. Change the admin password:
   - Go to **Users** (admin menu).
   - Edit the admin user and set a new password.
4. (Optional) Enable 2FA for your account:
   - Go to **Security** in the sidebar.
   - Click **Enable 2FA**, scan the QR code with Google Authenticator or similar, then verify.
5. Add users for your team:
   - **Users** → **Add User**.
   - Enter email, name, role (Meter User, Admin, etc.), branch.

---

## Quick Reference

| Item            | Link / Command                                       |
|-----------------|------------------------------------------------------|
| Health check    | `https://YOUR_BACKEND/api/health`                    |
| Generate secret | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| Seed DB (local) | `cd backend` then `npm run db:seed`                  |

---

## Alternative: Run on Your Own Computer (No Cloud)

For internal use on your network:

1. **Install Docker Desktop** from [docker.com](https://docker.com/products/docker-desktop).

2. **Start the stack**
   ```powershell
   cd c:\Users\27620\copier-meter-system\backend
   .\deploy.ps1
   ```

3. **Start the frontend**
   ```powershell
   cd c:\Users\27620\copier-meter-system\frontend
   npm run dev
   ```

4. **Share access**
   - Find your IP: `ipconfig` (IPv4 Address).
   - Update backend `.env`: `FRONTEND_URL=http://YOUR_IP:5173`.
   - Others visit: `http://YOUR_IP:5173`.

---

## Troubleshooting

**"Failed to fetch" or "Network error"**  
- Confirm `VITE_API_URL` in Vercel is the backend URL (no `/api`).
- Confirm `FRONTEND_URL` in Railway is the Vercel URL.

**"Invalid credentials"**  
- Run `npm run db:seed` against the production DB with correct `DATABASE_URL`.

**CORS errors**  
- Make sure `FRONTEND_URL` matches the frontend URL exactly (including `https://`).
