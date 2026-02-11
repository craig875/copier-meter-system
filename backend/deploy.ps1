# Deployment script for Copier Meter System Backend (PowerShell)
# This script helps set up and deploy the application

Write-Host "🚀 Copier Meter System - Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  No .env file found!" -ForegroundColor Yellow
    Write-Host "📝 Creating .env from env.example..." -ForegroundColor Yellow
    Copy-Item env.example .env
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Please edit .env file and set:" -ForegroundColor Yellow
    Write-Host "   - DB_PASSWORD (use a strong password)" -ForegroundColor Yellow
    Write-Host "   - JWT_SECRET (generate with: node -e `"console.log(require('crypto').randomBytes(32).toString('hex'))`")" -ForegroundColor Yellow
    Write-Host "   - FRONTEND_URL (your frontend URL)" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter after you've updated .env file"
}

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "   Visit: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Generate JWT secret if not set
$envContent = Get-Content .env -Raw
if ($envContent -match "your_very_secure_jwt_secret_key_here") {
    Write-Host "🔐 Generating JWT secret..." -ForegroundColor Cyan
    
    # Generate secret using Node.js
    $jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    
    # Update .env file
    (Get-Content .env) -replace "JWT_SECRET=.*", "JWT_SECRET=$jwtSecret" | Set-Content .env
    Write-Host "✅ JWT secret generated and saved" -ForegroundColor Green
    Write-Host ""
}

Write-Host "🐳 Starting Docker containers..." -ForegroundColor Cyan
Write-Host ""

# Start services
docker compose up -d

Write-Host ""
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "📊 Running database migrations..." -ForegroundColor Cyan
docker compose exec -T backend npx prisma migrate deploy

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Service Status:" -ForegroundColor Cyan
docker compose ps

Write-Host ""
Write-Host "🌐 Backend API: http://localhost:3001" -ForegroundColor Green
Write-Host "🏥 Health Check: http://localhost:3001/api/health" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test the API: Invoke-WebRequest http://localhost:3001/api/health" -ForegroundColor White
Write-Host "   2. View logs: docker compose logs -f backend" -ForegroundColor White
Write-Host "   3. Seed database (optional): docker compose exec backend npm run db:seed" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop: docker compose down" -ForegroundColor Yellow
Write-Host ""
