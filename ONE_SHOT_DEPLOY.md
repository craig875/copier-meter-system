# One-Shot Deploy Guide – Copier Meter System

**Goal:** Get your app online so your team can log in.  
**Time:** 30–45 minutes.  
**Cost:** Free (GitHub, Railway, Vercel).

---

## YOUR VALUES (fill these in as you go)

| What | Your value |
|------|------------|
| GitHub username | |
| Railway backend URL | |
| Vercel app URL | |
| JWT secret | |

---

# PHASE 1: GITHUB (about 5 min)

## 1.1 Open PowerShell

- Press **Win + X** → **Windows PowerShell** (or **Terminal**)

## 1.2 Run these commands (one per line, press Enter after each)

```powershell
cd c:\Users\27620\copier-meter-system
git add .
git commit -m "Deploy" --allow-empty
```

*(Use `--allow-empty` if there’s nothing new to commit.)*

## 1.3 Create GitHub repo (if needed)

- Go to [github.com/new](https://github.com/new)
- **Repository name:** `copier-meter-system`
- **Create repository**
- Copy the repo URL, e.g. `https://github.com/YOUR_USERNAME/copier-meter-system.git`

## 1.4 Push your code

```powershell
git remote add origin https://github.com/YOUR_USERNAME/copier-meter-system.git
git branch -M main
git push -u origin main
```

*(Replace `YOUR_USERNAME` with your GitHub username.)*

---

# PHASE 2: RAILWAY – BACKEND (about 15 min)

## 2.1 Start project

- Go to [railway.app](https://railway.app)
- **Login with GitHub**
- **New Project** → **Deploy from GitHub repo** → choose **copier-meter-system**

## 2.2 Add PostgreSQL

- In the project, click **+ New** (or **Add Service**)
- **Database** → **PostgreSQL**
- Wait until the status is green
- Click the PostgreSQL service → **Variables**
- Copy **DATABASE_URL** and paste it here: _________________________________

## 2.3 If PostgreSQL crashes

If the database fails to start with "catatonit" or similar:

- Go to [neon.tech](https://neon.tech) → sign up with GitHub
- **New Project** → **Create**
- Copy the connection string (starts with `postgresql://`)
- Use that string as **DATABASE_URL** in Railway from now on

## 2.4 Add your app

- Click **+ New** → **GitHub Repo** → **copier-meter-system**
- Click the new app service (not PostgreSQL)

## 2.5 Configure the app

**Settings** (gear icon):

- **Root Directory:** `backend`
- **Deploy** tab → **Custom Start Command:**
  ```
  npx prisma migrate deploy && npm run db:seed && npm start
  ```
- Save

*(The seed runs once on deploy; you can remove `npm run db:seed &&` later if you like.)*

## 2.6 Variables

**Variables** tab → add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | **Use `${{Postgres.DATABASE_URL}}`** if Railway shows it (recommended). Otherwise paste the URL from 2.2. |
| `JWT_SECRET` | *(see 2.7)* |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://temp.com` |
| `PORT` | `3001` |

## 2.7 Create JWT secret

In PowerShell:

```powershell
cd c:\Users\27620\copier-meter-system\backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the long string. Paste it as **JWT_SECRET** in Railway Variables.

## 2.8 Public URL

- **Settings** → **Networking** → **Generate Domain**
- Copy the URL (e.g. `https://xxx.up.railway.app`)
- Paste it here: _________________________________

---

# PHASE 3: VERCEL – FRONTEND (about 10 min)

## 3.1 Import project

- Go to [vercel.com](https://vercel.com)
- **Continue with GitHub** (or sign up)
- **Add New** → **Project**
- Select **copier-meter-system** → **Import**

## 3.2 Project settings

- **Root Directory:** click **Edit** → type `frontend` → **Continue**
- **Environment Variables** → add:
  - **Name:** `VITE_API_URL`
  - **Value:** your Railway URL from 2.8 (no slash at end, no `/api`)

## 3.3 Deploy

- **Deploy**
- Wait until it finishes (1–2 minutes)
- Copy the live URL (e.g. `https://copier-meter-system-xxx.vercel.app`)
- Paste it here: _________________________________

---

# PHASE 4: CONNECT BACKEND AND FRONTEND

## 4.1 Update Railway CORS

- Go back to [railway.app](https://railway.app)
- Open your **backend service** (app, not PostgreSQL)
- **Variables** → find **FRONTEND_URL**
- Change `https://temp.com` to your Vercel URL from 3.3
- Save

## 4.2 Redeploy backend

- **Deployments** → ⋮ on latest deployment → **Redeploy**
- Wait until it’s green

---

# PHASE 5: USE IT

## 5.1 Log in

- Open your Vercel URL in the browser
- **Email:** `admin@example.com`
- **Password:** `admin123`

## 5.2 Change password (recommended)

- **Users** (sidebar) → find admin → **Edit** → set a new password

## 5.3 Add users

- **Users** → **Add User**
- Enter email, name, role, and branch

---

# QUICK REFERENCE

| URL | Purpose |
|-----|---------|
| Your Vercel URL | Main app (login, capture, history) |
| `https://YOUR_RAILWAY_URL/api/health` | Backend health check |

---

# TROUBLESHOOTING

## White screen after login

- **Vercel** → **Settings** → **Environment Variables**:  
  `VITE_API_URL` = Railway URL, no trailing slash, no `/api`
- **Railway** → **Variables**:  
  `FRONTEND_URL` = exact Vercel URL
- Redeploy both (Vercel and Railway) after changes

## "Invalid credentials"

- Seed failed or didn’t run. Add this to Railway **Start Command**:
  ```
  npx prisma migrate deploy && npm run db:seed && npm start
  ```
- Redeploy the backend

## Build failed (Vercel exit 126)

- Build should work with the current setup.  
- If it still fails: **Vercel** → **Settings** → **Build Command:**  
  `npm run build`

## PostgreSQL keeps failing on Railway

- Use [Neon](https://neon.tech) (2.3), then set **DATABASE_URL** in Railway to the Neon connection string

---

**Admin login:** admin@example.com / admin123  
Change this password after first login.
