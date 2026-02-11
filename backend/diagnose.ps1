# Server Diagnostic Script
Write-Host "=== Server Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
Write-Host "1. Checking directory..." -ForegroundColor Yellow
$currentDir = Get-Location
Write-Host "   Current: $currentDir" -ForegroundColor Gray
if ($currentDir -like "*backend*") {
    Write-Host "   ✓ In backend directory" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Not in backend directory" -ForegroundColor Yellow
    Write-Host "   Run: cd C:\Users\27620\copier-meter-system\backend" -ForegroundColor Cyan
}

Write-Host ""

# Check if node_modules exists
Write-Host "2. Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✓ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ node_modules missing - Run: npm install" -ForegroundColor Red
}

Write-Host ""

# Check if .env exists
Write-Host "3. Checking configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ .env file missing" -ForegroundColor Red
    Write-Host "   Create .env file with DATABASE_URL, PORT, JWT_SECRET" -ForegroundColor Yellow
}

Write-Host ""

# Check if port is in use
Write-Host "4. Checking port 3001..." -ForegroundColor Yellow
$portCheck = netstat -ano | findstr :3001
if ($portCheck) {
    Write-Host "   ⚠ Port 3001 is in use:" -ForegroundColor Yellow
    Write-Host "   $portCheck" -ForegroundColor Gray
} else {
    Write-Host "   ✓ Port 3001 is available" -ForegroundColor Green
}

Write-Host ""

# Check if server is already running
Write-Host "5. Checking if server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✓ Server is already running!" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "   Server is not running" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Make sure you're in the backend directory" -ForegroundColor White
Write-Host "2. Run: npm install (if node_modules is missing)" -ForegroundColor White
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host "4. Check the terminal output for errors" -ForegroundColor White
