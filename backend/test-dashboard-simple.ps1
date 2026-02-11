# Simple Dashboard Test
$baseUrl = "http://localhost:3001"

# Step 1: Login
Write-Host "Logging in..." -ForegroundColor Yellow
$loginBody = @{ email = "admin@example.com"; password = "admin123" } | ConvertTo-Json
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
$loginData = $loginResponse.Content | ConvertFrom-Json
$token = $loginData.token

Write-Host "Login successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Get Dashboard
Write-Host "Getting dashboard..." -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer $token" }
$dashboardResponse = Invoke-WebRequest -Uri "$baseUrl/api/dashboard" -Method GET -Headers $headers -UseBasicParsing
$dashboardData = $dashboardResponse.Content | ConvertFrom-Json

Write-Host "=== MODULES ===" -ForegroundColor Green
$dashboardData.modules | ForEach-Object {
    Write-Host "  $($_.name) - $($_.description)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Full response:" -ForegroundColor Yellow
$dashboardData | ConvertTo-Json -Depth 10
