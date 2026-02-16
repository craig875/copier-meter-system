# Cloud Deployment Checklist

Use this checklist to ensure you have everything ready for cloud deployment.

## ✅ Pre-Deployment Checklist

### 1. Code Preparation
- [ ] Code is working locally
- [ ] All dependencies are in `package.json`
- [ ] No hardcoded secrets or passwords
- [ ] `.env` file is in `.gitignore` (should not be committed)
- [ ] Code is pushed to GitHub

### 2. GitHub Setup
- [ ] GitHub account created
- [ ] Repository created on GitHub
- [ ] Code pushed to GitHub
- [ ] Repository is public or you have access to connect it to cloud platform

### 3. Environment Variables Ready
- [ ] JWT_SECRET generated (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Know what FRONTEND_URL will be (can update later)
- [ ] DATABASE_URL will be provided by cloud platform

### 4. Choose Your Platform
- [ ] Railway (Recommended - Easiest)
- [ ] Render (Good free tier)
- [ ] DigitalOcean (Production-ready)

---

## 🚀 Deployment Steps (Railway - Recommended)

### Step 1: Sign Up
- [ ] Go to [railway.app](https://railway.app)
- [ ] Sign in with GitHub
- [ ] Authorize Railway to access your repositories

### Step 2: Create Project
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose your repository

### Step 3: Add Database
- [ ] Click "+ New" → "Database" → "Add PostgreSQL"
- [ ] Wait for database to be created
- [ ] Copy the `DATABASE_URL` from database service variables

### Step 4: Configure Backend
- [ ] Set Root Directory to `backend` (in service settings)
- [ ] Add Environment Variables:
  - [ ] `DATABASE_URL` = (from PostgreSQL service)
  - [ ] `JWT_SECRET` = (your generated secret)
  - [ ] `NODE_ENV` = `production`
  - [ ] `FRONTEND_URL` = (update after frontend deployment)
  - [ ] `PORT` = `3001`

### Step 5: Set Build Commands
- [ ] Build Command: `npm install && npx prisma generate`
- [ ] Start Command: `npx prisma migrate deploy && npm start`

### Step 6: Deploy
- [ ] Railway will auto-deploy
- [ ] Wait for deployment to complete (check logs)
- [ ] Generate public domain in Settings → Networking

### Step 7: Test
- [ ] Visit: `https://your-app.up.railway.app/api/health`
- [ ] Should see: `{"status":"ok","timestamp":"..."}`
- [ ] Test login endpoint

---

## 📱 Frontend Deployment

### Step 1: Choose Frontend Host
- [ ] Vercel (Recommended)
- [ ] Netlify
- [ ] Cloudflare Pages

### Step 2: Deploy Frontend
- [ ] Sign up at chosen platform
- [ ] Connect GitHub repository
- [ ] Set Root Directory to `frontend`
- [ ] Add Environment Variable: `VITE_API_URL` = your backend URL
- [ ] Deploy

### Step 3: Update Backend
- [ ] Update `FRONTEND_URL` in Railway backend variables
- [ ] Redeploy backend

---

## ✅ Post-Deployment Checklist

- [ ] Backend health check works
- [ ] Frontend can connect to backend
- [ ] Login works
- [ ] 2FA works (Security page, enable/disable, login with code)
- [ ] Database migrations ran successfully
- [ ] CORS is configured correctly
- [ ] All environment variables are set
- [ ] Application is accessible to team members
- [ ] URLs are shared with organization

---

## 🔧 Troubleshooting

### If deployment fails:
- [ ] Check build logs in platform dashboard
- [ ] Verify all environment variables are set
- [ ] Ensure DATABASE_URL is correct
- [ ] Check that migrations ran successfully

### If API doesn't work:
- [ ] Verify backend URL is correct
- [ ] Check CORS settings (FRONTEND_URL)
- [ ] Test health endpoint directly
- [ ] Review application logs

### If database errors:
- [ ] Verify DATABASE_URL is correct
- [ ] Check database is running
- [ ] Ensure migrations completed
- [ ] Try running migrations manually

---

## 📞 Quick Reference

**Generate JWT Secret:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Test Backend:**
```
https://your-backend-url/api/health
```

**View Logs:**
- Railway: Service → Deployments → View Logs
- Render: Service → Logs tab
- DigitalOcean: Service → Runtime Logs

---

## 🎯 Next Steps After Deployment

1. [ ] Test all features
2. [ ] Share URLs with team
3. [ ] Set up monitoring (optional)
4. [ ] Configure backups for database
5. [ ] Document access for team members
6. [ ] Set up custom domain (optional)

---

**Need help?** See `CLOUD_DEPLOYMENT.md` for detailed instructions.
