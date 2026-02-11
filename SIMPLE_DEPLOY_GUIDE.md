# Super Simple Deployment Guide

> **For a cleaner version:** See **ONE_SHOT_DEPLOY.md** – single guide with fill-in values and troubleshooting.

Do these steps one at a time. Don't skip any.

---

## BEFORE YOU START

You need:
- A free [GitHub](https://github.com) account
- A free [Railway](https://railway.app) account (sign up with GitHub)
- A free [Vercel](https://vercel.com) account (sign up with GitHub)

---

# PART 1: PUT YOUR CODE ON GITHUB

### Step 1
Open PowerShell. Press `Win + X`, then click "Windows PowerShell".

### Step 2
Type this and press Enter (change the path if your project is somewhere else):
```
cd c:\Users\27620\copier-meter-system
```

### Step 3
Type each of these, one at a time, pressing Enter after each:
```
git init
git add .
git commit -m "First commit"
```

### Step 4
Go to [github.com](https://github.com). Click the **+** in the top right → **New repository**.

### Step 5
- Name it: `copier-meter-system`
- Leave everything else as default
- Click **Create repository**

### Step 6
GitHub will show you some commands. Ignore them. In your PowerShell, type (replace YOUR_USERNAME with your GitHub username):
```
git remote add origin https://github.com/YOUR_USERNAME/copier-meter-system.git
git branch -M main
git push -u origin main
```
If it asks for login, sign in with your GitHub account.

---

# PART 2: DEPLOY THE BACKEND (Railway)

### Step 7
Go to [railway.app](https://railway.app). Click **Login** → **Login with GitHub**.

### Step 8
Click **New Project**.

### Step 9
Click **Deploy from GitHub repo**.

### Step 10
Click **Configure GitHub App** if it asks. Allow Railway to access your repos.

### Step 11
Click on **copier-meter-system** (your repo). Railway will start deploying. That's wrong – we need to set it up first.

### Step 12
Click the **+** button (or "Add Service"). Click **Database**. Click **PostgreSQL**.

### Step 13
Wait for the database to turn green. Click on it. Click the **Variables** tab. Find **DATABASE_URL**. Click the copy button. **Save this somewhere** – you'll need it soon.

### Step 14
Click **+** again. Click **GitHub Repo**. Select **copier-meter-system**.

### Step 15
Click on the new service you just added (the one that says "copier-meter-system", not the database).

### Step 16
Click **Settings** (or the gear icon). Find **Root Directory**. Click it. Type: `backend`. Press Enter.

### Step 17
Click **Variables** tab. Click **Add Variable** or **RAW Editor**. Add these one by one:

| Name | Value |
|------|-------|
| DATABASE_URL | Paste what you copied in Step 13 |
| JWT_SECRET | See Step 18 below |
| NODE_ENV | production |
| FRONTEND_URL | https://temp.com |
| PORT | 3001 |

### Step 18 (Get JWT_SECRET)
Open PowerShell. Type:
```
cd c:\Users\27620\copier-meter-system\backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
A long random string will appear. Copy it. That's your JWT_SECRET. Paste it into Railway.

### Step 19
In Railway, click **Settings** again. Find **Build Command**. Set it to:
```
npm install && npx prisma generate
```

### Step 20
Find **Start Command**. Set it to:
```
npx prisma migrate deploy && npm start
```

### Step 21
Click **Settings** → **Networking**. Click **Generate Domain**. A URL will appear like `https://something.up.railway.app`. **Copy this URL** – you need it for the frontend.

### Step 22 (Seed the database – create login users)
Open PowerShell. Type (replace THE_DATABASE_URL with what you saved from Step 13 – put it in quotes):
```
cd c:\Users\27620\copier-meter-system\backend
$env:DATABASE_URL="THE_DATABASE_URL"
npm run db:seed
```
Example: `$env:DATABASE_URL="postgresql://postgres:xxxxx@xxx.railway.app:5432/railway"`

You should see "Seeding completed!" and "Created admin user: admin@example.com".

---

# PART 3: DEPLOY THE FRONTEND (Vercel)

### Step 23
Go to [vercel.com](https://vercel.com). Click **Sign Up** → **Continue with GitHub**.

### Step 24
Click **Add New** → **Project**.

### Step 25
Find **copier-meter-system** in the list. Click **Import**.

### Step 26
Find **Root Directory**. Click **Edit**. Type: `frontend`. Click outside to save.

### Step 27
Find **Environment Variables**. Click to expand.
- **Name:** `VITE_API_URL`
- **Value:** Paste your Railway URL from Step 21 (the one like `https://something.up.railway.app` – NO slash at the end, NO /api)

### Step 28
Click **Deploy**. Wait 1–2 minutes.

### Step 29
When it says "Congratulations", you'll see a URL like `https://copier-meter-system-xxx.vercel.app`. **Copy this URL**.

---

# PART 4: CONNECT EVERYTHING

### Step 30
Go back to [railway.app](https://railway.app). Click on your backend service (the one that's not the database).

### Step 31
Click **Variables**. Find **FRONTEND_URL**. Change it from `https://temp.com` to your Vercel URL from Step 29.

### Step 32
Click **Deployments**. Click the **⋮** (three dots) on the latest one. Click **Redeploy**.

---

# DONE!

### Step 33
Open your Vercel URL in a browser (the one from Step 29).

### Step 34
Log in with:
- **Email:** admin@example.com
- **Password:** admin123

### Step 35
Change the password! Click **Users** (in the menu). Find the admin user. Edit it and set a new password.

### Step 36
Add your colleagues: **Users** → **Add User** → enter their email, name, and pick a role.

---

## LOGIN CREDENTIALS (after seeding)

| Email | Password |
|-------|----------|
| admin@example.com | admin123 |

**Change the admin password after first login!**

---

## SOMETHING BROKE?

**Can't log in?**  
Go back to Step 22 and run the seed command again with your DATABASE_URL.

**Page won't load / "Failed to fetch"?**  
Check Step 27: VITE_API_URL should be your Railway URL with NO /api at the end.  
Check Step 31: FRONTEND_URL should be your Vercel URL exactly.

**Still stuck?**  
Check the Railway logs: click your backend service → Deployments → click the latest → View Logs.
