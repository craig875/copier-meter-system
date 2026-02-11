# Hosting Guide for Copier Meter System

This guide provides multiple options for hosting your application so members of your organization can access it.

## Table of Contents
1. [Quick Start with Docker](#quick-start-with-docker)
2. [Cloud Hosting Options](#cloud-hosting-options)
3. [Self-Hosted Options](#self-hosted-options)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Security Considerations](#security-considerations)

---

## Quick Start with Docker

The easiest way to get started is using Docker Compose, which will set up both the database and backend automatically.

### Prerequisites
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Git (if cloning the repository)

### Steps

1. **Create a `.env` file** in the backend directory:
```env
# Database Configuration
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
DB_NAME=copier_meter_db
DB_PORT=5432

# Backend Configuration
BACKEND_PORT=3001
NODE_ENV=production
JWT_SECRET=your_very_secure_jwt_secret_key_here_min_32_chars
JWT_EXPIRES_IN=8h

# Frontend URL (update with your actual frontend URL)
FRONTEND_URL=http://localhost:5173
```

**⚠️ Important:** Generate a strong JWT_SECRET. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Start the services:**
```bash
cd backend
docker-compose up -d
```

3. **Run database migrations:**
```bash
docker-compose exec backend npx prisma migrate deploy
```

4. **Seed the database (optional):**
```bash
docker-compose exec backend npm run db:seed
```

5. **Check if services are running:**
```bash
docker-compose ps
```

6. **View logs:**
```bash
docker-compose logs -f backend
```

### Accessing the Application

- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/api/health
- **Database:** Accessible on localhost:5432 (if you need direct access)

### Stopping the Services

```bash
docker-compose down
```

To also remove volumes (⚠️ deletes database data):
```bash
docker-compose down -v
```

---

## Cloud Hosting Options

### Option 1: Railway (Recommended for Easy Setup)

Railway provides a simple way to deploy both your backend and database.

**Steps:**

1. **Sign up at [Railway.app](https://railway.app)**

2. **Create a New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo" (if your code is on GitHub)
   - Or select "Empty Project"

3. **Add PostgreSQL Database:**
   - Click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway will provide a `DATABASE_URL` automatically

4. **Deploy Backend:**
   - Click "+ New" → "GitHub Repo" (or "Empty Service")
   - Connect your repository
   - Add environment variables:
     ```
     DATABASE_URL=<from PostgreSQL service>
     JWT_SECRET=<generate a secure secret>
     NODE_ENV=production
     FRONTEND_URL=<your frontend URL>
     PORT=3001
     ```
   - Railway will auto-detect Node.js and deploy

5. **Run Migrations:**
   - In Railway dashboard, open the backend service
   - Go to "Deployments" → "View Logs"
   - Use the CLI or add a build command:
     ```
     npx prisma migrate deploy && npm start
     ```

6. **Get Your Backend URL:**
   - Railway provides a public URL like: `https://your-app.railway.app`
   - Update your frontend's API URL to this

**Pricing:** Free tier available, then ~$5-20/month

---

### Option 2: Render

Render offers free PostgreSQL and easy Node.js deployment.

**Steps:**

1. **Sign up at [Render.com](https://render.com)**

2. **Create PostgreSQL Database:**
   - Dashboard → "New +" → "PostgreSQL"
   - Choose a name and region
   - Copy the "Internal Database URL"

3. **Deploy Backend:**
   - Dashboard → "New +" → "Web Service"
   - Connect your GitHub repository
   - Settings:
     - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
     - **Start Command:** `npm start`
     - **Environment:** Node
   - Add environment variables:
     ```
     DATABASE_URL=<from PostgreSQL service>
     JWT_SECRET=<your secret>
     NODE_ENV=production
     FRONTEND_URL=<your frontend URL>
     PORT=3001
     ```

4. **Deploy:**
   - Render will build and deploy automatically
   - You'll get a URL like: `https://your-app.onrender.com`

**Pricing:** Free tier available (with limitations), then ~$7-25/month

---

### Option 3: DigitalOcean App Platform

**Steps:**

1. **Sign up at [DigitalOcean](https://www.digitalocean.com)**

2. **Create App:**
   - Go to "Apps" → "Create App"
   - Connect your GitHub repository

3. **Configure Services:**
   - **Database:** Add a PostgreSQL database component
   - **Backend:** Add a web service component
     - Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
     - Run command: `npm start`
     - Environment variables (same as above)

4. **Deploy:**
   - DigitalOcean will handle the deployment
   - You'll get a URL automatically

**Pricing:** ~$5-12/month for basic setup

---

### Option 4: AWS / Azure / Google Cloud

For enterprise-grade hosting, you can use major cloud providers:

**AWS:**
- **EC2** for the backend server
- **RDS** for PostgreSQL database
- **Elastic Beanstalk** for easier deployment

**Azure:**
- **App Service** for backend
- **Azure Database for PostgreSQL**

**Google Cloud:**
- **Cloud Run** for backend (containerized)
- **Cloud SQL** for PostgreSQL

These require more setup but offer better scalability and enterprise features.

---

## Self-Hosted Options

### Option 1: VPS (Virtual Private Server)

If you have a VPS (from providers like DigitalOcean, Linode, Vultr, etc.):

1. **SSH into your server:**
```bash
ssh user@your-server-ip
```

2. **Install Docker:**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **Clone your repository:**
```bash
git clone <your-repo-url>
cd copier-meter-system/backend
```

4. **Create `.env` file** (as described in Docker section)

5. **Start services:**
```bash
docker-compose up -d
```

6. **Set up reverse proxy (Nginx):**
```bash
sudo apt update
sudo apt install nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/copier-meter
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/copier-meter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

7. **Set up SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 2: On-Premises Server

If you have a physical server in your organization:

1. Follow the VPS instructions above
2. Ensure the server has a static IP address
3. Configure your organization's firewall to allow:
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 3001 (if accessing directly, otherwise only 80/443)
4. Set up DNS to point your domain to the server's IP

---

## Environment Configuration

### Production Environment Variables

Create a `.env` file with these variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database_name

# Server
NODE_ENV=production
PORT=3001

# Security
JWT_SECRET=<generate a strong secret, min 32 characters>
JWT_EXPIRES_IN=8h

# Frontend
FRONTEND_URL=https://your-frontend-domain.com
```

### Generating Secure Secrets

**JWT Secret:**
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Python
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Database Setup

### Using Docker Compose (Easiest)

The `docker-compose.yml` file automatically sets up PostgreSQL.

### Manual PostgreSQL Setup

1. **Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

2. **Create database:**
```bash
sudo -u postgres psql
CREATE DATABASE copier_meter_db;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE copier_meter_db TO your_user;
\q
```

3. **Update DATABASE_URL:**
```
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/copier_meter_db
```

4. **Run migrations:**
```bash
npm run db:migrate
```

---

## Security Considerations

### 1. **Environment Variables**
- Never commit `.env` files to Git
- Use secure secret management in production
- Rotate secrets regularly

### 2. **HTTPS/SSL**
- Always use HTTPS in production
- Set up SSL certificates (Let's Encrypt is free)
- Update `FRONTEND_URL` to use `https://`

### 3. **CORS Configuration**
- In production, set `FRONTEND_URL` to your actual frontend domain
- Don't use `*` or allow all origins in production

### 4. **Database Security**
- Use strong database passwords
- Don't expose database ports publicly
- Use connection pooling
- Regular backups

### 5. **Firewall Rules**
- Only expose necessary ports (80, 443)
- Don't expose database port (5432) publicly
- Use VPN or SSH tunneling for database access if needed

### 6. **Rate Limiting**
Consider adding rate limiting to prevent abuse:
```bash
npm install express-rate-limit
```

### 7. **Monitoring**
- Set up logging and monitoring
- Use services like Sentry for error tracking
- Monitor database performance

---

## Frontend Deployment

Your frontend also needs to be deployed. Common options:

1. **Vercel** - Excellent for React/Vue/Next.js apps
2. **Netlify** - Great for static sites and SPAs
3. **Cloudflare Pages** - Fast CDN-backed hosting
4. **Same server as backend** - Serve static files with Nginx

After deploying the frontend, update the backend's `FRONTEND_URL` environment variable.

---

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` is correct
- Verify database is running
- Check firewall rules
- Ensure database user has correct permissions

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # macOS/Linux

# Kill process or change PORT in .env
```

### Migration Issues
```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Or manually run migrations
npx prisma migrate deploy
```

### Docker Issues
```bash
# View logs
docker-compose logs backend

# Restart services
docker-compose restart

# Rebuild containers
docker-compose up -d --build
```

---

## Next Steps

1. Choose a hosting option that fits your needs
2. Set up the backend following the guide
3. Deploy your frontend
4. Update environment variables
5. Test the application
6. Set up monitoring and backups
7. Share the URL with your organization members

---

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f backend`
2. Verify environment variables
3. Test database connection
4. Check firewall and network settings

For more help, refer to:
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)
