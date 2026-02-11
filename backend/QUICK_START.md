# Quick Start - Deploy Your Application

This is the fastest way to get your application running for your organization.

## Option 1: Docker (Easiest - Recommended) ⭐

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed

### Steps

1. **Open PowerShell in the backend directory:**
   ```powershell
   cd C:\Users\27620\copier-meter-system\backend
   ```

2. **Run the deployment script:**
   ```powershell
   .\deploy.ps1
   ```
   
   Or manually:
   ```powershell
   # Copy environment template
   Copy-Item env.example .env
   
   # Edit .env and set your passwords and secrets
   notepad .env
   
   # Start services
   docker compose up -d
   
   # Run migrations
   docker compose exec backend npx prisma migrate deploy
   ```

3. **Test it:**
   - Open browser: http://localhost:3001/api/health
   - Should see: `{"status":"ok","timestamp":"..."}`

4. **Access your application:**
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/api/health

### Making it Accessible to Your Organization

To allow others in your organization to access it:

**Option A: Use your computer's IP address**
1. Find your IP: `ipconfig` (look for IPv4 Address)
2. Update `FRONTEND_URL` in `.env` to use your IP
3. Others can access: `http://YOUR_IP:3001`

**Option B: Deploy to a cloud service** (see HOSTING_GUIDE.md)
- Railway (easiest)
- Render
- DigitalOcean

**Option C: Use a VPS or server** (see HOSTING_GUIDE.md)

---

## Option 2: Cloud Hosting (Best for Production)

### Railway (Easiest Cloud Option)

1. Go to [railway.app](https://railway.app) and sign up
2. Create new project → Add PostgreSQL database
3. Add backend service → Connect GitHub repo
4. Add environment variables:
   - `DATABASE_URL` (from PostgreSQL service)
   - `JWT_SECRET` (generate a secure secret)
   - `NODE_ENV=production`
   - `FRONTEND_URL` (your frontend URL)
5. Railway will deploy automatically
6. Get your public URL and share it!

**See HOSTING_GUIDE.md for detailed instructions**

---

## Environment Variables Needed

Create a `.env` file with:

```env
# Database (for Docker)
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=copier_meter_db

# Backend
JWT_SECRET=generate_with_node_command_below
NODE_ENV=production
FRONTEND_URL=http://your-frontend-url

# Generate JWT_SECRET:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Troubleshooting

### Port already in use?
```powershell
# Find what's using port 3001
netstat -ano | findstr :3001

# Kill it (replace PID with the number from above)
taskkill /PID <PID> /F
```

### Docker not starting?
- Make sure Docker Desktop is running
- Check: `docker --version`

### Database connection error?
- Check `.env` file has correct `DATABASE_URL`
- Make sure PostgreSQL container is running: `docker compose ps`

### View logs:
```powershell
docker compose logs -f backend
```

---

## Next Steps

1. ✅ Backend is running
2. 📱 Deploy your frontend (see frontend directory)
3. 🔗 Update `FRONTEND_URL` in backend `.env`
4. 👥 Share the URL with your team
5. 🔒 Set up HTTPS/SSL for production

**For detailed hosting options, see HOSTING_GUIDE.md**
