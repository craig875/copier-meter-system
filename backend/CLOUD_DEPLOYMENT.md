# Cloud Deployment Guide - Web-Based Hosting

This guide will help you deploy your application to the cloud so your organization can access it via the web.

## 🎯 Recommended Options (Easiest to Hardest)

1. **Railway** ⭐ (Easiest - Recommended)
2. **Render** (Good free tier)
3. **DigitalOcean App Platform** (Simple & reliable)
4. **Vercel** (Great for frontend, can host backend too)

---

## Option 1: Railway (Recommended) ⭐

Railway is the easiest option - it auto-detects your setup and handles everything.

### Prerequisites
- GitHub account (free)
- Your code pushed to GitHub

### Step-by-Step

#### 1. Push Your Code to GitHub

If you haven't already:

```powershell
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create a repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/copier-meter-system.git
git branch -M main
git push -u origin main
```

#### 2. Deploy on Railway

1. **Sign up at [railway.app](https://railway.app)**
   - Click "Start a New Project"
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `copier-meter-system` repository

3. **Add PostgreSQL Database**
   - In your project, click "+ New"
   - Select "Database" → "Add PostgreSQL"
   - Railway will create the database automatically
   - **Copy the `DATABASE_URL`** from the database service (click on it, then "Variables" tab)

4. **Configure Backend Service**
   - Railway should auto-detect your backend folder
   - If not, click "+ New" → "GitHub Repo" → Select your repo
   - Set the **Root Directory** to `backend`
   - Go to "Settings" → "Variables" and add:

   ```
   DATABASE_URL=<paste the DATABASE_URL from PostgreSQL service>
   JWT_SECRET=<generate a secure secret - see below>
   NODE_ENV=production
   FRONTEND_URL=<your frontend URL - update after deploying frontend>
   PORT=3001
   ```

5. **Generate JWT Secret**
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and paste it as `JWT_SECRET`

6. **Set Build Command** (in Settings → Build)
   ```
   npm install && npx prisma generate
   ```

7. **Set Start Command** (in Settings → Deploy)
   ```
   npx prisma migrate deploy && npm start
   ```

8. **Deploy**
   - Railway will automatically deploy when you push to GitHub
   - Or click "Deploy" in the dashboard
   - Wait for deployment to complete

9. **Get Your Backend URL**
   - Click on your backend service
   - Go to "Settings" → "Networking"
   - Click "Generate Domain" to get a public URL
   - Your backend will be at: `https://your-app-name.up.railway.app`

10. **Test Your API**
    - Visit: `https://your-app-name.up.railway.app/api/health`
    - Should see: `{"status":"ok","timestamp":"..."}`

#### 3. Deploy Frontend (Next Step)

After backend is working:
- Deploy frontend to Vercel/Netlify (see Frontend Deployment section)
- Update `FRONTEND_URL` in Railway backend variables
- Redeploy backend

**Pricing:** Free tier includes $5 credit/month, then ~$5-20/month

---

## Option 2: Render

Render offers a good free tier and is straightforward.

### Step-by-Step

#### 1. Push Code to GitHub (same as Railway)

#### 2. Deploy on Render

1. **Sign up at [render.com](https://render.com)**
   - Sign in with GitHub

2. **Create PostgreSQL Database**
   - Dashboard → "New +" → "PostgreSQL"
   - Name: `copier-meter-db`
   - Region: Choose closest to you
   - Plan: Free (or paid for production)
   - Click "Create Database"
   - **Copy the "Internal Database URL"** (you'll need this)

3. **Deploy Backend**
   - Dashboard → "New +" → "Web Service"
   - Connect your GitHub repository
   - Settings:
     - **Name:** `copier-meter-backend`
     - **Root Directory:** `backend`
     - **Environment:** `Node`
     - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
     - **Start Command:** `npm start`
   - Click "Advanced" → Add Environment Variables:
     ```
     DATABASE_URL=<Internal Database URL from step 2>
     JWT_SECRET=<generate with node command>
     NODE_ENV=production
     FRONTEND_URL=<your frontend URL>
     PORT=3001
     ```
   - Click "Create Web Service"

4. **Get Your Backend URL**
   - Render will provide: `https://copier-meter-backend.onrender.com`
   - First deployment takes ~5-10 minutes

5. **Test Your API**
   - Visit: `https://copier-meter-backend.onrender.com/api/health`

**Note:** Free tier services spin down after 15 minutes of inactivity (first request will be slow)

**Pricing:** Free tier available, then ~$7-25/month

---

## Option 3: DigitalOcean App Platform

### Step-by-Step

1. **Sign up at [digitalocean.com](https://www.digitalocean.com)**

2. **Create App**
   - Go to "Apps" → "Create App"
   - Connect GitHub account
   - Select your repository

3. **Configure Services**
   - **Database Component:**
     - Click "Edit" → "Add Resource" → "Database"
     - Choose PostgreSQL
     - Plan: Basic ($12/month) or Dev Database ($7/month)
   
   - **Backend Component:**
     - Root Directory: `backend`
     - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
     - Run Command: `npm start`
     - Environment Variables:
       ```
       DATABASE_URL=<from database component>
       JWT_SECRET=<your secret>
       NODE_ENV=production
       FRONTEND_URL=<your frontend URL>
       PORT=3001
       ```

4. **Deploy**
   - Click "Create Resources"
   - DigitalOcean will build and deploy
   - Get your URL from the dashboard

**Pricing:** ~$12-25/month

---

## Frontend Deployment

After your backend is deployed, you need to deploy your frontend:

### Vercel (Recommended for Frontend)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. "Add New Project" → Select your repo
4. Root Directory: `frontend`
5. Framework Preset: Auto-detect (React/Vue/etc.)
6. Environment Variables:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```
   (or whatever your backend URL is)
7. Deploy!

### Netlify

1. Go to [netlify.com](https://netlify.com)
2. Sign in with GitHub
3. "Add new site" → "Import an existing project"
4. Select your repo
5. Base directory: `frontend`
6. Build command: `npm run build` (or your build command)
7. Publish directory: `dist` (or your build output)
8. Environment Variables:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```
9. Deploy!

### Update Backend CORS

After deploying frontend, update your backend's `FRONTEND_URL`:
- Railway: Settings → Variables → Update `FRONTEND_URL`
- Render: Environment → Update `FRONTEND_URL`
- Redeploy backend

---

## Environment Variables Checklist

Make sure you have these in your cloud platform:

```
✅ DATABASE_URL (provided by database service)
✅ JWT_SECRET (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
✅ NODE_ENV=production
✅ FRONTEND_URL (your frontend URL after deploying)
✅ PORT=3001 (usually auto-set, but good to specify)
```

---

## Testing Your Deployment

1. **Health Check:**
   ```
   https://your-backend-url/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Login:**
   - Use your frontend or Postman
   - POST to `https://your-backend-url/api/auth/login`
   - With: `{"email":"your-email","password":"your-password"}`

3. **Check Logs:**
   - Railway: Click service → "Deployments" → "View Logs"
   - Render: Click service → "Logs" tab
   - DigitalOcean: Click service → "Runtime Logs"

---

## Troubleshooting

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check database is running (in dashboard)
- Ensure migrations ran: Check build logs

### Build Failures
- Check build logs for errors
- Verify `package.json` has all dependencies
- Ensure Prisma schema is correct

### CORS Errors
- Update `FRONTEND_URL` to your actual frontend URL
- Redeploy backend after updating

### Slow First Request (Render Free Tier)
- This is normal - free tier spins down after inactivity
- Consider paid tier for production

---

## Next Steps After Deployment

1. ✅ Backend deployed and tested
2. ✅ Frontend deployed
3. ✅ Update `FRONTEND_URL` in backend
4. ✅ Test full application flow
5. ✅ Share URLs with your organization
6. ✅ Set up monitoring (optional)
7. ✅ Set up backups for database

---

## Quick Comparison

| Platform | Ease | Free Tier | Best For |
|----------|------|-----------|----------|
| **Railway** | ⭐⭐⭐⭐⭐ | $5 credit/month | Easiest setup |
| **Render** | ⭐⭐⭐⭐ | Yes (with limits) | Good free option |
| **DigitalOcean** | ⭐⭐⭐ | No | Production reliability |

**Recommendation:** Start with **Railway** for the easiest experience!

---

## Need Help?

- Check platform-specific documentation
- Review build/deployment logs
- Verify environment variables are set correctly
- Test database connection separately
