# Prepare Your Code for Cloud Deployment

Follow these steps to get your code ready for cloud hosting.

## Step 1: Ensure Code is on GitHub

Most cloud platforms require your code to be on GitHub (or GitLab/Bitbucket).

### If you don't have Git initialized:

```powershell
# Navigate to your project root (one level up from backend)
cd C:\Users\27620\copier-meter-system

# Initialize Git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - ready for cloud deployment"
```

### Create GitHub Repository:

1. Go to [github.com](https://github.com) and sign in
2. Click the "+" icon → "New repository"
3. Name it: `copier-meter-system` (or your preferred name)
4. **Don't** initialize with README (you already have code)
5. Click "Create repository"

### Push to GitHub:

```powershell
# Add GitHub as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/copier-meter-system.git

# Rename branch to main (if needed)
git branch -M main

# Push your code
git push -u origin main
```

---

## Step 2: Verify .gitignore

Make sure `.gitignore` exists and includes:
- `.env` files (never commit secrets!)
- `node_modules/`
- Log files
- IDE files

The `.gitignore` file has been created for you. ✅

---

## Step 3: Generate JWT Secret

You'll need this for cloud deployment:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy the output** - you'll paste it as `JWT_SECRET` in your cloud platform.

---

## Step 4: Test Locally First

Make sure everything works before deploying:

```powershell
cd backend

# Install dependencies
npm install

# Make sure you have a .env file with local settings
# Test that server starts
npm run dev
```

Visit: http://localhost:3001/api/health

Should see: `{"status":"ok","timestamp":"..."}`

---

## Step 5: Choose Your Cloud Platform

### Recommended: Railway ⭐
- Easiest setup
- Auto-detects everything
- Free tier: $5 credit/month
- **Go to:** [railway.app](https://railway.app)

### Alternative: Render
- Good free tier
- Simple interface
- **Go to:** [render.com](https://render.com)

### Alternative: DigitalOcean
- Production-ready
- More control
- **Go to:** [digitalocean.com](https://www.digitalocean.com)

---

## Step 6: Deploy!

Follow the guide in **CLOUD_DEPLOYMENT.md** for step-by-step instructions.

---

## Quick Checklist

Before deploying, make sure:

- [ ] Code is pushed to GitHub
- [ ] `.gitignore` includes `.env` files
- [ ] Application works locally
- [ ] JWT_SECRET is generated
- [ ] You have a GitHub account
- [ ] You've chosen a cloud platform

---

## What You'll Need During Deployment

1. **GitHub Repository URL:** `https://github.com/YOUR_USERNAME/copier-meter-system`
2. **JWT_SECRET:** (from step 3 above)
3. **Backend Root Directory:** `backend`
4. **Frontend Root Directory:** `frontend` (for later)

---

## Environment Variables You'll Set

In your cloud platform, you'll add these:

```
DATABASE_URL=<provided by cloud platform>
JWT_SECRET=<your generated secret>
NODE_ENV=production
FRONTEND_URL=<update after deploying frontend>
PORT=3001
```

---

## Next Steps

1. ✅ Code is on GitHub
2. ✅ Follow **CLOUD_DEPLOYMENT.md** for deployment
3. ✅ Use **DEPLOYMENT_CHECKLIST.md** to track progress
4. ✅ Deploy frontend after backend is working
5. ✅ Share URLs with your organization

---

**Ready?** Head to **CLOUD_DEPLOYMENT.md** to start deploying! 🚀
