#!/bin/bash

# Deployment script for Copier Meter System Backend
# This script helps set up and deploy the application

set -e

echo "🚀 Copier Meter System - Deployment Script"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo "📝 Creating .env from env.example..."
    cp env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file and set:"
    echo "   - DB_PASSWORD (use a strong password)"
    echo "   - JWT_SECRET (generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    echo "   - FRONTEND_URL (your frontend URL)"
    echo ""
    read -p "Press Enter after you've updated .env file..."
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Generate JWT secret if not set
if grep -q "your_very_secure_jwt_secret_key_here" .env; then
    echo "🔐 Generating JWT secret..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # Update .env file (works on both Linux and macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    else
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    fi
    echo "✅ JWT secret generated and saved"
    echo ""
fi

echo "🐳 Starting Docker containers..."
echo ""

# Start services
if docker compose version &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 5

echo ""
echo "📊 Running database migrations..."
if docker compose version &> /dev/null; then
    docker compose exec -T backend npx prisma migrate deploy
else
    docker-compose exec -T backend npx prisma migrate deploy
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Service Status:"
if docker compose version &> /dev/null; then
    docker compose ps
else
    docker-compose ps
fi

echo ""
echo "🌐 Backend API: http://localhost:3001"
echo "🏥 Health Check: http://localhost:3001/api/health"
echo ""
echo "📝 Next steps:"
echo "   1. Test the API: curl http://localhost:3001/api/health"
echo "   2. View logs: docker compose logs -f backend"
echo "   3. Seed database (optional): docker compose exec backend npm run db:seed"
echo ""
echo "🛑 To stop: docker compose down"
echo ""
